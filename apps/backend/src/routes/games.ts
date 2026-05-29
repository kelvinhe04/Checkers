import { Hono } from "hono";
import { z } from "zod";
import { type BoardSize, type FirstMove } from "@checkers/shared";
import { authMiddleware } from "../lib/auth.js";
import {
  batchDeleteGames,
  createGame,
  deleteGame,
  GameError,
  getGame,
  listActiveGames,
  playerMove,
  resumeGame,
  triggerAiTurn,
} from "../services/games.js";

export const gamesRouter = new Hono();

gamesRouter.use("*", authMiddleware);

const PositionSchema = z.object({
  row: z.number().int().min(0).max(11),
  col: z.number().int().min(0).max(11),
});

const MoveSchema = z.object({
  from: PositionSchema,
  to: PositionSchema,
  captures: z.array(PositionSchema).default([]),
  promoted: z.boolean().optional(),
});

const CreateGameSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  playerColor: z.enum(["red", "black"]).default("red"),
  boardSize: z.union([z.literal(8), z.literal(10), z.literal(12)]).default(8),
  firstMove: z.enum(["computer", "player", "random"]).default("player"),
  forceJumps: z.boolean().default(true),
  showMoves: z.boolean().default(true),
  skinId: z.string().default("classic"),
});

function resolveFirstTurn(
  playerColor: "red" | "black",
  firstMove: FirstMove,
): "red" | "black" {
  switch (firstMove) {
    case "player":
      return playerColor;
    case "computer":
      return playerColor === "red" ? "black" : "red";
    case "random":
      return Math.random() < 0.5 ? "red" : "black";
  }
}

gamesRouter.post("/", async (c) => {
  const user = c.get("userDoc");
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateGameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_payload", issues: parsed.error.issues }, 400);
  }
  const firstTurn = resolveFirstTurn(
    parsed.data.playerColor,
    parsed.data.firstMove,
  );
  const snap = await createGame({
    user,
    difficulty: parsed.data.difficulty,
    playerColor: parsed.data.playerColor,
    firstTurn,
    boardSize: parsed.data.boardSize as BoardSize,
    options: {
      forceJumps: parsed.data.forceJumps,
      showMoves: parsed.data.showMoves,
    },
    skinId: parsed.data.skinId,
  });
  return c.json(snap, 201);
});

gamesRouter.get("/", async (c) => {
  const user = c.get("userDoc");
  const list = await listActiveGames(user);
  return c.json({ games: list });
});

gamesRouter.get("/:id", async (c) => {
  const user = c.get("userDoc");
  const snap = await getGame(user, c.req.param("id"));
  if (!snap) return c.json({ error: "game_not_found" }, 404);
  return c.json(snap);
});

gamesRouter.post("/:id/resume", async (c) => {
  const user = c.get("userDoc");
  try {
    const snap = await resumeGame(user, c.req.param("id"));
    return c.json(snap);
  } catch (err) {
    if (err instanceof GameError) {
      return c.json(
        { error: err.message },
        err.httpStatus as 400 | 401 | 404 | 409 | 422 | 500,
      );
    }
    throw err;
  }
});

gamesRouter.post("/batch-delete", async (c) => {
  const user = c.get("userDoc");
  const body = await c.req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  if (ids.length === 0) return c.json({ error: "no_ids" }, 400);
  await batchDeleteGames(user, ids);
  return c.json({ ok: true });
});

gamesRouter.delete("/:id", async (c) => {
  const user = c.get("userDoc");
  try {
    await deleteGame(user, c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof GameError) {
      return c.json(
        { error: err.message },
        err.httpStatus as 400 | 401 | 404 | 409 | 422 | 500,
      );
    }
    throw err;
  }
});

gamesRouter.post("/:id/ai-turn", async (c) => {
  const user = c.get("userDoc");
  const log = c.get("log");
  const correlationId = c.get("correlationId");
  try {
    const snap = await triggerAiTurn(c.req.param("id"), {
      correlationId,
      log,
    });
    return c.json({ snapshot: snap });
  } catch (err) {
    if (err instanceof GameError) {
      return c.json(
        { error: err.message },
        err.httpStatus as 400 | 401 | 404 | 409 | 422 | 500,
      );
    }
    log.error({ err }, "ai_turn_failed");
    return c.json({ error: "internal_error" }, 500);
  }
});

gamesRouter.post("/:id/move", async (c) => {
  const user = c.get("userDoc");
  const log = c.get("log");
  const correlationId = c.get("correlationId");
  const body = await c.req.json().catch(() => ({}));
  const parsed = MoveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_move_payload", issues: parsed.error.issues }, 400);
  }
  try {
    const result = await playerMove({
      user,
      gameId: c.req.param("id"),
      move: parsed.data,
      correlationId,
      log,
    });
    return c.json(result);
  } catch (err) {
    if (err instanceof GameError) {
      return c.json(
        { error: err.message },
        err.httpStatus as 400 | 401 | 404 | 409 | 422 | 500,
      );
    }
    log.error({ err }, "player_move_failed");
    return c.json({ error: "internal_error" }, 500);
  }
});
