import { Hono } from "hono";
import { correlationMiddleware } from "./lib/correlation.js";
import { logger } from "./lib/logger.js";
import { moveRouter } from "./routes/move.js";

const app = new Hono();

app.use("*", correlationMiddleware);

app.get("/health", (c) => c.json({ ok: true, service: "ai-service" }));

app.route("/move", moveRouter);

app.onError((err, c) => {
  c.get("log").error({ err }, "unhandled_error");
  return c.json({ error: "internal_error" }, 500);
});

const port = Number(process.env.AI_PORT ?? 4100);

logger.info({ port }, "ai-service listening");

export default {
  port,
  fetch: app.fetch,
};
