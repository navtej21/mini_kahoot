import { Router } from 'express';
import type { Request } from 'express';
import type { RoomService } from '../service/roomService.js';
import { validate } from '../middleware/validate.js';
import { addQuestionsBody, codeParams, createRoomBody, joinBody } from '../schemas.js';

// Reads "Authorization: Bearer <token>" and returns just the token.
function bearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

export function roomRoutes(service: RoomService): Router {
  const router = Router();

  router.post('/', validate({ body: createRoomBody }), (req, res) => {
    const room = service.createRoom(req.body.title);
    res.status(201).json({ code: room.code, title: room.title, hostToken: room.hostToken });
  });

  router.post(
    '/:code/questions',
    validate({ params: codeParams, body: addQuestionsBody }),
    (req, res) => {
      const total = service.addQuestions(req.params.code.toString(), bearer(req), req.body.questions);
      res.status(201).json({ totalQuestions: total });
    },
  );

  router.post('/:code/join', validate({ params: codeParams, body: joinBody }), (req, res) => {
    const { room, player } = service.join(req.params.code.toString(), req.body.nickname);
    res.status(201).json({
      roomCode: room.code,
      playerId: player.id,
      nickname: player.nickname,
      token: player.token,
    });
  });

  return router;
}