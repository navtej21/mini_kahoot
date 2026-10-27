import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { Player, Question, Room } from "../types.js";
import type { RoomRepo } from "../repo/roomRepo.js";
import { AppError } from "../error.js";
import { QuestionInput } from "../schemas.js";
import { assertTransition } from "../transitions.js";
import { RoomBus } from "../sse/roombus.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_QUESTIONS = 20;
const MAX_PLAYERS = 100;
const bus=new RoomBus();

export class RoomService {
  constructor(private repo: RoomRepo) {
    this.bus=bus;

    
  }

  authenticateMember(
    code: string,
    token: string | undefined,
  ): { room: Room; player?: Player } {
    const room = this.get(code);

    if (!token) {
      throw new AppError(401, "MISSING_TOKEN", "Token required");
    }

    if (token === room.hostToken) {
      return {
        room,
      };
    }

    for (const player of room.players.values()) {
      if (player.token === token) {
        return {
          room,
          player,
        };
      }
    }
    throw new AppError(
      403,
      "INVALID_TOKEN",
      "Token does not belong to this room",
    );
  }

   setConnected(room: Room, player: Player, connected: boolean): void {
    player.connected = connected;
    this.repo.save(room);
  }

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
      hostToken: randomBytes(24).toString("hex"),
      status: "lobby",
      questions: [],
      currentIndex: 0,
      players: new Map(),
      createdAt: now,
      lastActivityAt: now,
    };
    this.repo.save(room);
    return room;
  }

  // now we will write the 2 functions 1 . where the host is adding the question and 2. participants joining the lobby

  addQuestions(
    code: string,
    token: string | undefined,
    inputs: QuestionInput[],
  ): number {
    const room = this.get(code);
    this.assertHost(room, token);

    if (room.status !== "lobby") {
      throw new AppError(
        409,
        "GAME_ALREADY_STARTED",
        "Cannot add questions after the game started",
      );
    }
    if (room.questions.length + inputs.length > MAX_QUESTIONS) {
      throw new AppError(
        409,
        "TOO_MANY_QUESTIONS",
        `A room holds at most ${MAX_QUESTIONS} questions`,
      );
    }

    const added: Question[] = inputs.map((q) => ({ id: randomUUID(), ...q }));
    room.questions.push(...added);
    room.lastActivityAt = Date.now();
    this.repo.save(room);
    return room.questions.length;
  }

  join(code: string, nickname: string): { room: Room; player: Player } {
    const room = this.get(code);

    if (room.status !== "lobby") {
      throw new AppError(
        409,
        "GAME_ALREADY_STARTED",
        "This game has already started",
      );
    }
    if (room.players.size >= MAX_PLAYERS) {
      throw new AppError(409, "ROOM_FULL", "This room is full");
    }
    const taken = [...room.players.values()].some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
    );
    if (taken) {
      throw new AppError(
        409,
        "NICKNAME_TAKEN",
        "That nickname is already used in this room",
      );
    }

    const player: Player = {
      id: randomUUID(),
      token: randomBytes(24).toString("hex"),
      nickname,
      score: 0,
      connected: false,
    };
    room.players.set(player.id, player);
    room.lastActivityAt = Date.now();
    this.repo.save(room);
    return { room, player };
  }


  startGame(code:string,token:string|undefined):Room{

    const room = this.get(code);
    this.assertHost(room, token);

    if (room.status !== 'lobby') {
      throw new AppError(409, 'GAME_ALREADY_STARTED', 'This game has already started');
    }
    if (room.questions.length === 0) {
      throw new AppError(409, 'NO_QUESTIONS', 'Add at least one question first');
    }
    if (room.players.size === 0) {
      throw new AppError(409, 'NO_PLAYERS', 'At least one player must join first');
    }


    assertTransition(room.status, 'question');
    room.status = 'question';
    room.currentIndex = 0;
    room.lastActivityAt = Date.now();
    this.repo.save(room);


    

    return room;
  }
}
