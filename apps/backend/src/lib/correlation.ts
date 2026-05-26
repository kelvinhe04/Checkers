import type { MiddlewareHandler } from "hono";
import { logger } from "./logger.js";

const HEADER = "x-correlation-id";

export const correlationMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header(HEADER);
  const id = incoming && incoming.length < 128 ? incoming : crypto.randomUUID();
  const log = logger.child({
    correlationId: id,
    path: c.req.path,
    method: c.req.method,
  });
  c.set("correlationId", id);
  c.set("log", log);

  const start = Date.now();
  try {
    await next();
  } finally {
    const ms = Date.now() - start;
    log.info({ status: c.res.status, ms }, "request");
    c.res.headers.set(HEADER, id);
  }
};

declare module "hono" {
  interface ContextVariableMap {
    correlationId: string;
    log: ReturnType<typeof logger.child>;
  }
}
