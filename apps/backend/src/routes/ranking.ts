import { Hono } from "hono";
import type { BoardSize, Difficulty } from "@checkers/shared";
import { getTopRanking } from "../services/ranking.js";

export const rankingRouter = new Hono();

const VALID_DIFFICULTIES = new Set<string>(["easy", "medium", "hard"]);
const VALID_SIZES = new Set<number>([8, 10, 12]);

// Ranking es público — no requiere auth.
rankingRouter.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);

  const diffParam = c.req.query("difficulty");
  const sizeParam = c.req.query("boardSize");

  const difficulty =
    diffParam && VALID_DIFFICULTIES.has(diffParam)
      ? (diffParam as Difficulty)
      : undefined;
  const boardSize =
    sizeParam && VALID_SIZES.has(Number(sizeParam))
      ? (Number(sizeParam) as BoardSize)
      : undefined;

  const entries = await getTopRanking(
    limit,
    difficulty || boardSize ? { difficulty, boardSize } : undefined,
  );
  return c.json({ entries });
});
