import type { Room } from "../types.js";

export interface RoomRepo {
  get(code: string): Room | undefined;
  save(room: Room): void;
  delete(code: string): void;
  has(code: string): boolean;
  all(): Room[];
}


export class InMemoryRoomRepo implements RoomRepo {
  private rooms = new Map<string, Room>();

  get(code: string) {
    return this.rooms.get(code);
  }
  save(room: Room) {
    this.rooms.set(room.code, room);
  }
  delete(code: string) {
    this.rooms.delete(code);
  }
  has(code: string) {
    return this.rooms.has(code);
  }
  all() {
    return [...this.rooms.values()];
  }
}
