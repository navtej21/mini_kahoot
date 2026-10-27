import type { RoomStatus } from "../types.js";

export interface PlayerSummary {
  id: string;
  nickname: string; // public info only: never the token
}

export type RoomEvent =
 {type: 'game_started'; data: { totalQuestions: number } }
  | { type: 'connected'; data: { status: RoomStatus; players: PlayerSummary[] } }
  | { type: 'player_joined'; data: PlayerSummary };