import pino from "pino";

export const logger = pino({
  name: "ai-service",
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "ai-service",
    env: process.env.SERVICE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
