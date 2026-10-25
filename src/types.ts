// The stages a game goes through, in order.
export type RoomStatus = 'lobby' | 'question' | 'reveal' | 'finished';

export interface Question {
  id: string;
  text: string;
  options: string[];      // 2 to 4 answer choices
  correctIndex: number;   // which option is right (0 = first)
  timeLimitSec: number;
}

export interface Player {
  id: string;             // public: safe to show to everyone
  token: string;          // secret: proves "I am this player"
  nickname: string;
  score: number;
  connected: boolean;
}

export interface Room {
  code: string;           // short code players type to join, like "K7M2QX"
  title: string;
  hostToken: string;      // secret: proves "I am the host"
  status: RoomStatus;
  questions: Question[];
  currentIndex: number;   // which question we're on
  players: Map<string, Player>;   // keyed by player id
  createdAt: number;
  lastActivityAt: number;
}