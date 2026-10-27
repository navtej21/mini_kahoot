import { describe, it, expect } from 'vitest';
import { BusMessage, RoomBus } from '../src/sse/roombus.js';


const joined = (nickname: string) => ({
  type: 'player_joined' as const,
  data: { id: nickname, nickname },
});

describe('RoomBus', () => {
  it('delivers events to subscribers of that room only', () => {
    const bus = new RoomBus();
    const a: BusMessage[] = [];
    const b: BusMessage[] = [];
    bus.subscribe('AAAAAA', (m) => a.push(m));
    bus.subscribe('BBBBBB', (m) => b.push(m));

    bus.publish('AAAAAA', joined('Asha'));

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new RoomBus();
    const got: BusMessage[] = [];
    const unsubscribe = bus.subscribe('AAAAAA', (m) => got.push(m));
    bus.publish('AAAAAA', joined('one'));
    unsubscribe();
    bus.publish('AAAAAA', joined('two'));
    expect(got).toHaveLength(1);
  });

  it('numbers events 1, 2, 3 per room', () => {
    const bus = new RoomBus();
    expect(bus.publish('AAAAAA', joined('x')).id).toBe(1);
    expect(bus.publish('AAAAAA', joined('y')).id).toBe(2);
    expect(bus.publish('BBBBBB', joined('z')).id).toBe(1);
  });

  it('replays only events after a given id', () => {
    const bus = new RoomBus();
    bus.publish('AAAAAA', joined('one'));
    bus.publish('AAAAAA', joined('two'));
    bus.publish('AAAAAA', joined('three'));
    expect(bus.eventsSince('AAAAAA', 1).map((m) => m.id)).toEqual([2, 3]);
  });

  it('keeps only the last 100 events', () => {
    const bus = new RoomBus();
    for (let i = 0; i < 150; i++) bus.publish('AAAAAA', joined(String(i)));
    const all = bus.eventsSince('AAAAAA', 0);
    expect(all).toHaveLength(100);
    expect(all[0].id).toBe(51);
  });
});