import type { MiddlewareHandler } from "hono";

/**
 * El microservicio de IA NO es público: lo llama únicamente el backend.
 * Verificamos un token compartido por cabecera Authorization.
 */
export const internalAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const expected = process.env.AI_SERVICE_TOKEN ?? "";
  if (!expected) {
    // Si no hay token configurado, dejamos pasar SOLO en desarrollo.
    if ((process.env.SERVICE_ENV ?? "development") !== "development") {
      return c.json({ error: "AI_SERVICE_TOKEN not configured" }, 500);
    }
    return next();
  }
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (token !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
};
