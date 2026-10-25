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

  describe('attacks (documenting current behaviour)', () => {
    const q = { text: 'Q?', options: ['a', 'b'], correctIndex: 0, timeLimitSec: 20 };

    it('attack 1: forged host tokens', () => {
      const service = makeService();
      const a = service.createRoom('A');
      const b = service.createRoom('B');

      // Empty string: falsy, so it is treated as "no token" (401)
      expect(() => service.addQuestions(a.code, '', [q])).toThrow(/required/);
      // Blank string: truthy but wrong (403)
      expect(() => service.addQuestions(a.code, ' ', [q])).toThrow(/Only the host/);
      // Another room's host token must not work here (403)
      expect(() => service.addQuestions(a.code, b.hostToken, [q])).toThrow(/Only the host/);
    });

    it('attack 2: lookalike nicknames', () => {
      const service = makeService();
      const room = service.createRoom('x');
      service.join(room.code, 'Asha');

      // If these do NOT throw, the attack works: a second "Asha" got in
      expect(() => service.join(room.code, 'Asha ')).not.toThrow();       // trailing space
      expect(() => service.join(room.code, 'Аsha')).not.toThrow();        // Cyrillic А
      expect(() => service.join(room.code, 'As\u200Bha')).not.toThrow();  // zero-width char
    });

    it('attack 3: no cap on total rooms', () => {
      const repo = new InMemoryRoomRepo();
      const service = new RoomService(repo);
      for (let i = 0; i < 50_000; i++) service.createRoom('spam');
      // Nothing stopped us, so memory can be exhausted
      expect(repo.all().length).toBe(50_000);
    });

    it('attack 4: caller-supplied id overrides the server id', () => {
      const service = makeService();
      const room = service.createRoom('x');
      service.addQuestions(room.code, room.hostToken, [{ ...q, id: 'evil' } as any]);
      // If this is 'evil', the attack works
      expect(room.questions[0].id).toBe('evil');
    });
  });