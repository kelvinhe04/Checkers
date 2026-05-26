import { Hono } from "hono";
import { z } from "zod";
import { SUPPORTED_BOARD_SIZES } from "@checkers/shared";
import { decideMove } from "../engine/decide.js";
import { internalAuthMiddleware } from "../lib/auth.js";

const SquareSchema = z.enum([".", "r", "R", "b", "B"]);

/**
 * Acepta tableros cuadrados de tamaños soportados (8, 10, 12).
 * Validamos que sea cuadrado en el .refine.
 */
const BoardSchema = z
  .array(z.array(SquareSchema))
  .min(8)
  .max(12)
  .refine(
    (rows) => {
      const n = rows.length;
      if (!(SUPPORTED_BOARD_SIZES as readonly number[]).includes(n)) return false;
      return rows.every((r) => r.length === n);
    },
    { message: "board must be square with size in [8,10,12]" },
  );

const GameOptionsSchema = z
  .object({
    forceJumps: z.boolean(),
    showMoves: z.boolean(),
  })
  .partial()
  .optional();

const MoveRequestSchema = z.object({
  board: BoardSchema,
  turn: z.enum(["red", "black"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  options: GameOptionsSchema,
});

export const moveRouter = new Hono();

moveRouter.use("*", internalAuthMiddleware);

moveRouter.post("/", async (c) => {
  const log = c.get("log");
  const body = await c.req.json().catch(() => null);
  const parsed = MoveRequestSchema.safeParse(body);
  if (!parsed.success) {
    log.warn({ issues: parsed.error.issues }, "invalid /move payload");
    return c.json({ error: "invalid_payload", issues: parsed.error.issues }, 400);
  }
  const { board, turn, difficulty, options } = parsed.data;

  const opts = {
    forceJumps: options?.forceJumps ?? true,
    showMoves: options?.showMoves ?? true,
  };

  try {
    const result = decideMove(board, turn, difficulty, opts);
    log.info(
      {
        difficulty,
        turn,
        size: board.length,
        depth: result.depth,
        ms: result.computeMs,
        evaluation: result.evaluation,
      },
      "ai_move_chosen",
    );
    return c.json(result);
  } catch (err) {
    if ((err as Error).message === "no_legal_moves") {
      return c.json({ error: "no_legal_moves" }, 422);
    }
    log.error({ err }, "ai_move_failed");
    return c.json({ error: "internal_error" }, 500);
  }
});
