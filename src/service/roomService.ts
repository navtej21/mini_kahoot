import { randomBytes, randomInt } from "node:crypto";
import type { Room } from "../types.js";
import type { RoomRepo } from "../repo/roomRepo.js";
import { AppError } from "../error.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomService {
  constructor(private repo: RoomRepo) {}

  private generateCode(): string {
    for (let i = 0; i < 10; i++) {
      let code = "";
      for (let j = 0; j < 6; j++) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.repo.has(code)) {
        return code;
      }
    }
    throw new AppError(503, "SERVER_BUSY", "Could not allocate a room code");
  }

  //get function
  public get(code: string): Room {
    const room = this.repo.get(code);
    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
    }
    return room;
  }

  // check if the host is really inside the room
  assertHost(room: Room, token: string | undefined): void {
    if (!token) throw new AppError(401, "MISSING_TOKEN", "Host token required");
    if (token !== room.hostToken) {
      throw new AppError(403, "NOT_HOST", "Only the host can do this");
    }
  }

 createRoom(title: string): Room {
    const now = Date.now();
    const room: Room = {
      code: this.generateCode(),
      title,
      hostToken: randomBytes(24).toString('hex'),
      status: 'lobby',
      questions: [],
      currentIndex: 0,
      players: new Map(),
      createdAt: now,
      lastActivityAt: now,
    };
    this.repo.save(room);
    return room;
  }
}
