import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";
import { toUserProfile } from "../services/profile.js";

export const profileRouter = new Hono();

profileRouter.use("*", authMiddleware);

profileRouter.get("/", async (c) => {
  return c.json(toUserProfile(c.get("userDoc")));
});
