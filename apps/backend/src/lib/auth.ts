// =========================================================================
// Verificación de tokens de Clerk. El frontend pide a Clerk una sesión JWT
// (template `CLERK_JWT_TEMPLATE`) y la envía como Bearer al backend.
// =========================================================================

import { createClerkClient, verifyToken } from "@clerk/backend";
import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";
import { collections, type UserDoc } from "../db/mongo.js";

export const clerk = config.clerk.secretKey
  ? createClerkClient({
      secretKey: config.clerk.secretKey,
      publishableKey: config.clerk.publishableKey,
    })
  : null;

export interface AuthUser {
  clerkId: string;
  email: string;
  name: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    userDoc: UserDoc;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const log = c.get("log");
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return c.json({ error: "missing_token" }, 401);
  }

  if (!config.clerk.secretKey) {
    log.error("CLERK_SECRET_KEY not configured");
    return c.json({ error: "auth_not_configured" }, 500);
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: config.clerk.secretKey,
    });
    const clerkId = payload.sub;
    if (!clerkId) {
      return c.json({ error: "invalid_token" }, 401);
    }

    // Resolvemos perfil; preferimos lo que ya está en payload pero hacemos
    // upsert en Mongo para mantener una copia local.
    const email =
      (payload["email"] as string | undefined) ??
      (payload["primary_email_address"] as string | undefined) ??
      "";
    const name =
      (payload["name"] as string | undefined) ??
      (payload["fullName"] as string | undefined) ??
      email.split("@")[0] ??
      "Player";

    const auth: AuthUser = { clerkId, email, name };
    c.set("user", auth);

    const userDoc = await upsertUser(auth);
    c.set("userDoc", userDoc);

    await next();
  } catch (err) {
    log.warn({ err }, "auth_failed");
    return c.json({ error: "invalid_token" }, 401);
  }
};

export async function upsertUser(u: AuthUser): Promise<UserDoc> {
  const { users } = collections();
  const now = new Date();
  const update = {
    $setOnInsert: {
      clerkId: u.clerkId,
      premiumActive: false,
      stripeCustomerId: null,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        totalMovesInWins: 0,
      },
      createdAt: now,
    },
    $set: {
      name: u.name,
      email: u.email,
      updatedAt: now,
    },
  };
  await users.updateOne({ clerkId: u.clerkId }, update, { upsert: true });
  const doc = await users.findOne({ clerkId: u.clerkId });
  if (!doc) throw new Error("user upsert failed");
  return doc;
}
