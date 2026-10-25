import { describe, it, expect } from 'vitest';
import { RoomService } from '../src/service/roomService.js';
import { InMemoryRoomRepo } from '../src/repo/roomRepo.js';
import { AppError } from '../src/error.js';


const makeService = () => new RoomService(new InMemoryRoomRepo());

describe('RoomService', () => {
  it('creates a room in lobby with a valid code and host token', () => {
    const room = makeService().createRoom('Friday quiz');
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(room.status).toBe('lobby');
    expect(room.hostToken).toHaveLength(48);
  });

  it('gives each room a different code', () => {
    const service = makeService();
    const codes = new Set(Array.from({ length: 50 }, () => service.createRoom('x').code));
    expect(codes.size).toBe(50);
  });

  it('throws 404 for an unknown room', () => {
    expect(() => makeService().get('NOPE00')).toThrow(AppError);
    try {
      makeService().get('NOPE00');
    } catch (e) {
      expect((e as AppError).status).toBe(404);
    }
  });

  it('assertHost: 401 without a token, 403 with a wrong one, passes with the right one', () => {
    const service = makeService();
    const room = service.createRoom('x');
    expect(() => service.assertHost(room, undefined)).toThrow(/required/);
    expect(() => service.assertHost(room, 'wrong')).toThrow(/Only the host/);
    expect(() => service.assertHost(room, room.hostToken)).not.toThrow();
  });
});