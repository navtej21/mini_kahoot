import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ConnectionManager } from '../src/sse/connectionmanager.js';
import { RoomBus } from '../src/sse/roombus.js';

// A stand-in for Express's response: records what was written.
function fakeRes() {
  const res: any = new EventEmitter();
  res.chunks = [] as string[];
  res.ended = false;
  res.status = () => res;
  res.set = () => res;
  res.flushHeaders = () => {};
  res.write = (s: string) => {
    res.chunks.push(s);
    return true;
  };
  res.end = () => {
    res.ended = true;
  };
  return res;
}

const initial = { type: 'connected' as const, data: { status: 'lobby' as const, players: [] } };
const joined = (n: string) => ({ type: 'player_joined' as const, data: { id: n, nickname: n } });

afterEach(() => vi.useRealTimers());

describe('ConnectionManager', () => {
  it('writes the snapshot first, then bus events in SSE format', () => {
    const bus = new RoomBus();
    const res = fakeRes();
    new ConnectionManager(bus).open({ code: 'AAAAAA', res, initial });

    bus.publish('AAAAAA', joined('Asha'));

    expect(res.chunks[0]).toContain('event: connected');
    expect(res.chunks[1]).toBe('id: 1\nevent: player_joined\ndata: {"id":"Asha","nickname":"Asha"}\n\n');
  });

  it('stops delivering and calls onClose once when the client leaves', () => {
    const bus = new RoomBus();
    const res = fakeRes();
    const onClose = vi.fn();
    new ConnectionManager(bus).open({ code: 'AAAAAA', res, initial, onClose });

    res.emit('close');
    res.emit('close'); // a second close must do nothing
    bus.publish('AAAAAA', joined('late'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(res.chunks).toHaveLength(1); // only the snapshot
    expect(res.ended).toBe(true);
  });

  it('sends a heartbeat every 20 seconds, and stops after close', () => {
    vi.useFakeTimers();
    const bus = new RoomBus();
    const res = fakeRes();
    new ConnectionManager(bus).open({ code: 'AAAAAA', res, initial });

    vi.advanceTimersByTime(20_000);
    expect(res.chunks.at(-1)).toBe(': ping\n\n');

    res.emit('close');
    const count = res.chunks.length;
    vi.advanceTimersByTime(60_000);
    expect(res.chunks).toHaveLength(count);
  });

  it('a connection whose write throws does not break the others', () => {
    const bus = new RoomBus();
    const manager = new ConnectionManager(bus);
    const broken = fakeRes();
    const healthy = fakeRes();

    manager.open({ code: 'AAAAAA', res: broken, initial });
    manager.open({ code: 'AAAAAA', res: healthy, initial });
    broken.write = () => {
      throw new Error('socket dead');
    };

    expect(() => bus.publish('AAAAAA', joined('Asha'))).not.toThrow();
    expect(healthy.chunks).toHaveLength(2); // snapshot + the event
  });
});