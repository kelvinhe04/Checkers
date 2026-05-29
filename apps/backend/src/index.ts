// =========================================================================
// Backend principal — Hono sobre Bun. Punto de entrada.
// =========================================================================

import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { verifyToken } from "@clerk/backend";
import { config } from "./config.js";
import { connectMongo } from "./db/mongo.js";
import { correlationMiddleware } from "./lib/correlation.js";
import { logger } from "./lib/logger.js";
import { billingRouter } from "./routes/billing.js";
import { gamesRouter } from "./routes/games.js";
import { profileRouter } from "./routes/profile.js";
import { rankingRouter } from "./routes/ranking.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { broadcast, subscribe, unsubscribeAll, type SocketData } from "./ws/hub.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? config.frontendOrigin,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Correlation-Id"],
    credentials: true,
    maxAge: 600,
  }),
);

app.use("*", correlationMiddleware);

app.get("/health", (c) =>
  c.json({ ok: true, service: "backend", env: config.serviceEnv }),
);

// Webhooks ANTES de cualquier middleware que consuma JSON.
app.route("/api/webhooks", webhooksRouter);

app.route("/api/games", gamesRouter);
app.route("/api/ranking", rankingRouter);
app.route("/api/me", profileRouter);
app.route("/api/billing", billingRouter);

app.onError((err, c) => {
  c.get("log").error({ err: String(err) }, "unhandled_error");
  return c.json({ error: "internal_error" }, 500);
});

// =========================================================================
// Arranque
// =========================================================================

await connectMongo();

const server = Bun.serve<SocketData>({
  port: config.port,
  async fetch(req, srv): Promise<Response | undefined> {
    const url = new URL(req.url);

    // ---- WebSocket upgrade ----
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token") ?? "";
      const gameId = url.searchParams.get("gameId") ?? "";

      if (!gameId) {
        return new Response("missing_gameId", { status: 400 });
      }
      if (!token || !config.clerk.secretKey) {
        return new Response("unauthorized", { status: 401 });
      }
      let clerkId: string;
      try {
        const payload = await verifyToken(token, {
          secretKey: config.clerk.secretKey,
        });
        if (!payload.sub) throw new Error("no_sub");
        clerkId = payload.sub;
      } catch {
        return new Response("unauthorized", { status: 401 });
      }

      const ok = srv.upgrade(req, {
        data: { gameId: null, clerkId } satisfies SocketData,
      });
      if (ok) {
        return undefined;
      }
      return new Response("ws_upgrade_failed", { status: 500 });
    }

    return app.fetch(req);
  },

  websocket: {
    open(ws: ServerWebSocket<SocketData>) {
      logger.debug({ clerkId: ws.data.clerkId }, "ws_open");
    },
    message(ws, msg) {
      try {
        const data = JSON.parse(typeof msg === "string" ? msg : msg.toString());
        if (data.type === "subscribe" && typeof data.gameId === "string") {
          subscribe(ws, data.gameId);
          // Acuse: el servicio enviará "state" cuando haya cambios; el frontend
          // ya tiene el snapshot inicial vía REST. Aquí solo confirmamos.
          ws.send(JSON.stringify({ type: "subscribed", gameId: data.gameId }));
          return;
        }
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "bad_message" }));
      }
    },
    close(ws) {
      unsubscribeAll(ws);
      logger.debug({ clerkId: ws.data.clerkId }, "ws_close");
    },
  },
});

logger.info({ port: server.port }, "backend listening");

// Re-export para que el broadcast siga funcionando incluso si esto se importa
// como módulo (testing futuro).
export { broadcast };
