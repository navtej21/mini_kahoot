import {EventEmitter} from "node:events";
import type { RoomEvent } from "./events.js";

export interface BusMessage {
  id: number;
  event: RoomEvent;
}

interface Channel {
  emitter: EventEmitter;
  nextId: number;
  history: BusMessage[];
}

const HISTORY_LIMIT = 100;

export class RoomBus {
  private channels = new Map<String, Channel>();

  private channel(code: string): Channel {
    let ch = this.channels.get(code);
    if (!ch) {
      ch = { emitter: new EventEmitter(), nextId: 1, history: [] };
      ch.emitter.setMaxListeners(200); // more than 10 listeners is normal for us
      this.channels.set(code, ch);
    }
    return ch;
  }

  publish(code: string, event: RoomEvent): BusMessage {
    const ch = this.channel(code);
    const msg: BusMessage = { id: ch.nextId++, event };
    ch.history.push(msg);
    if (ch.history.length > HISTORY_LIMIT) ch.history.shift();
    ch.emitter.emit("event", msg);
    return msg;
  }

  subscribe(code: string, listener: (msg: BusMessage) => void): () => void {
    const ch = this.channel(code);
    ch.emitter.on("event", listener);
    return () => ch.emitter.off("event", listener);
  }

  eventsSince(code: string, lastId: number): BusMessage[] {
    return (this.channels.get(code)?.history ?? []).filter(
      (m) => m.id > lastId,
    );
  }

  close(code: string): void {
    const ch = this.channels.get(code);

    if(!ch){
      return;
    }


    ch.emitter.removeAllListeners();
    this.channels.delete(code);
  }
}
