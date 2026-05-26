import { Hono } from "hono";
import { getTopRanking } from "../services/ranking.js";

export const rankingRouter = new Hono();

// Ranking es público — no requiere auth.
rankingRouter.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);
  const entries = await getTopRanking(limit);
  return c.json({ entries });
});
