import { Router } from "express";
import type { Request } from "express";
import type { RoomService } from "../service/roomService.js";
import { validate } from "../middleware/validate.js";
import {
  addQuestionsBody,
  codeParams,
  createRoomBody,
  joinBody,
} from "../schemas.js";
import type { ConnectionManager } from "../sse/connectionmanager.js";

// Reads "Authorization: Bearer <token>" and returns just the token.
function bearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7);
}

export function roomRoutes(
  service: RoomService,
  manager: ConnectionManager,
): Router {
  const router = Router();

  router.post("/", validate({ body: createRoomBody }), (req, res) => {
    const room = service.createRoom(req.body.title);
    res
      .status(201)
      .json({ code: room.code, title: room.title, hostToken: room.hostToken });
  });

  router.post(
    "/:code/questions",
    validate({ params: codeParams, body: addQuestionsBody }),
    (req, res) => {
      const total = service.addQuestions(
        req.params.code.toString(),
        bearer(req),
        req.body.questions,
      );
      res.status(201).json({ totalQuestions: total });
    },
  );

  router.post(
    "/:code/join",
    validate({ params: codeParams, body: joinBody }),
    (req, res) => {
      const { room, player } = service.join(
        req.params.code.toString(),
        req.body.nickname,
      );
      res.status(201).json({
        roomCode: room.code,
        playerId: player.id,
        nickname: player.nickname,
        token: player.token,
      });
    },
  );

  router.get("/:code/events", validate({ params: codeParams }), (req, res) => {
    // Browser EventSource can't set headers, so we also accept ?token=
    const token =
      bearer(req) ??
      (typeof req.query.token === "string" ? req.query.token : undefined);

    // Authentication happens BEFORE any stream headers, so a bad token
    // gets a normal JSON 401/403/404 from the error handler.
    const { room, player } = service.authenticateMember(
      req.params.code.toString(),
      token,
    );

    if (player) {
      service.setConnected(room, player, true);
    }
    manager.open({
      code: room.code,
      res,
      initial: {
        type: "connected",
        data: {
          status: room.status,
          players: [...room.players.values()].map((p) => ({
            id: p.id,
            nickname: p.nickname,
          })),
        },
      },
      onClose: () => {
        console.log(`stream closed: ${player ? player.nickname : "host"}`); // temporary
        if (player) service.setConnected(room, player, false);
      },
    });
  });

  return router;
}
