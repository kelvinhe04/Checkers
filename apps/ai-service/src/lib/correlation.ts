import type { MiddlewareHandler } from "hono";
import { logger } from "./logger.js";

const CORRELATION_HEADER = "x-correlation-id";

function newId(): string {
  // crypto.randomUUID está disponible en Bun y Node 19+.
  return crypto.randomUUID();
}

/**
 * Middleware: inyecta un correlation ID a cada request y lo expone como
 * `c.var.correlationId` y `c.var.log` (logger ya enriquecido).
 */
export const correlationMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header(CORRELATION_HEADER);
  const correlationId = incoming && incoming.length < 128 ? incoming : newId();
  const log = logger.child({ correlationId, path: c.req.path, method: c.req.method });

  c.set("correlationId", correlationId);
  c.set("log", log);

  const start = Date.now();
  try {
    await next();
  } finally {
    const ms = Date.now() - start;
    log.info({ status: c.res.status, ms }, "request");
    c.res.headers.set(CORRELATION_HEADER, correlationId);
  }
};

declare module "hono" {
  interface ContextVariableMap {
    correlationId: string;
    log: ReturnType<typeof logger.child>;
  }
}
