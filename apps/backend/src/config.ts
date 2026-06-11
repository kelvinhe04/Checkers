// =========================================================================
// Configuración: lee env vars y expone valores tipados.
// =========================================================================

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    // No tiramos error inmediato: el backend debe poder arrancar y mostrar
    // errores claros cuando se intenta usar la pieza no configurada.
    return "";
  }
  return v;
}

export const config = {
  port: Number(process.env.BACKEND_PORT ?? 4000),
  serviceEnv: process.env.SERVICE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",

  mongo: {
    url:
      process.env.MONGO_URL ??
      "mongodb://checkers:checkers@mongo:27017/checkers?authSource=admin",
    dbName: process.env.MONGO_DB_NAME ?? "checkers",
  },

  ai: {
    url: process.env.AI_SERVICE_URL ?? "http://ai-service:4100",
    token: required("AI_SERVICE_TOKEN"),
  },

  clerk: {
    secretKey: required("CLERK_SECRET_KEY"),
    publishableKey: required("CLERK_PUBLISHABLE_KEY"),
    jwtTemplate: process.env.CLERK_JWT_TEMPLATE ?? "checkers-backend",
  },

  stripe: {
    secretKey: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    pricePremium: required("STRIPE_PRICE_PREMIUM"),
    successUrl:
      process.env.STRIPE_SUCCESS_URL ?? "http://localhost:5173/premium?status=success",
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ?? "http://localhost:5173/premium?status=cancel",
  },
} as const;

export type Config = typeof config;
