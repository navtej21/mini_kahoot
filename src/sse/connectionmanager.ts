import type { Response } from 'express';

import type { RoomEvent } from './events.js';
import { BusMessage, RoomBus } from './roombus.js';

const HEARTBEAT_MS = 20_000;

// Turns a bus message into the text format SSE requires.
export function formatSse(msg: BusMessage): string {
  return (
    `id: ${msg.id}\n` +
    `event: ${msg.event.type}\n` +
    `data: ${JSON.stringify(msg.event.data)}\n\n`
  );
}

export class ConnectionManager {
  constructor(private bus: RoomBus) {}

  open(opts: {
    code: string;
    res: Response;
    initial: RoomEvent;
    onClose?: () => void;
  }): void {
    const { code, res, initial, onClose } = opts;

    // 1. Headers: "this is a stream, keep it open".
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    // 2. The first message: current state, so the client isn't blank.
    res.write(`event: ${initial.type}\ndata: ${JSON.stringify(initial.data)}\n\n`);

    // 3. Future events: whatever the bus announces, write to this connection.
    const unsubscribe = this.bus.subscribe(code, (msg) => {
      try {
        res.write(formatSse(msg));
      } catch {
        cleanup(); // a dead connection must not break other listeners
      }
    });

    // 4. Heartbeat: a ":" line is a comment, ignored by clients, but it keeps
    //    proxies from closing an idle connection.
    const timer = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        cleanup();
      }
    }, HEARTBEAT_MS);

    // 5. Cleanup, guaranteed to run only once.
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      unsubscribe();
      onClose?.();
      res.end();
    };
    res.on('close', cleanup);
  }
}