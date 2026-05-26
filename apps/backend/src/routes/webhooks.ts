// =========================================================================
// Webhook de Stripe. La firma se verifica con STRIPE_WEBHOOK_SECRET.
//
// IMPORTANTE: este endpoint necesita el RAW body para verificar firma. Por
// eso lo aislamos antes de cualquier middleware que consuma JSON.
// =========================================================================

import { Hono } from "hono";
import Stripe from "stripe";
import { config } from "../config.js";
import { collections } from "../db/mongo.js";
import { requireStripe } from "../lib/stripe.js";

export const webhooksRouter = new Hono();

webhooksRouter.post("/stripe", async (c) => {
  const log = c.get("log");
  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }
  if (!config.stripe.webhookSecret) {
    return c.json({ error: "webhook_secret_not_configured" }, 503);
  }

  const sig = c.req.header("stripe-signature");
  if (!sig) return c.json({ error: "missing_signature" }, 400);

  const raw = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, config.stripe.webhookSecret);
  } catch (err) {
    log.warn({ err }, "stripe_signature_invalid");
    return c.json({ error: "invalid_signature" }, 400);
  }

  log.info({ type: event.type, id: event.id }, "stripe_event");

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const clerkId = (s.client_reference_id ?? s.metadata?.clerkId) ?? null;
      const customerId = (s.customer as string | null) ?? null;
      if (clerkId) {
        await collections().users.updateOne(
          { clerkId },
          {
            $set: {
              premiumActive: true,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
              updatedAt: new Date(),
            },
          },
        );
      }
      if (clerkId && customerId && typeof s.subscription === "string") {
        await collections().subscriptions.updateOne(
          { userId: clerkId },
          {
            $set: {
              userId: clerkId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: s.subscription,
              status: "active",
              currentPeriodEnd: null,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const status = sub.status;
      const active = status === "active" || status === "trialing";

      const user = await collections().users.findOne({
        stripeCustomerId: customerId,
      });
      if (user) {
        await collections().users.updateOne(
          { clerkId: user.clerkId },
          {
            $set: {
              premiumActive: active,
              updatedAt: new Date(),
            },
          },
        );
        await collections().subscriptions.updateOne(
          { userId: user.clerkId },
          {
            $set: {
              userId: user.clerkId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const user = await collections().users.findOne({
        stripeCustomerId: customerId,
      });
      if (user) {
        await collections().users.updateOne(
          { clerkId: user.clerkId },
          { $set: { premiumActive: false, updatedAt: new Date() } },
        );
        await collections().subscriptions.updateOne(
          { userId: user.clerkId },
          { $set: { status: "canceled", updatedAt: new Date() } },
        );
      }
      break;
    }
    default:
      // Eventos no relevantes — los aceptamos sin tocar nada.
      break;
  }

  return c.json({ received: true });
});
