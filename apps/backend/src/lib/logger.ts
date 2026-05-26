import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  name: "backend",
  level: config.logLevel,
  base: {
    service: "backend",
    env: config.serviceEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
