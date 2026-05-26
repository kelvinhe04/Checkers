import { Hono } from "hono";
import { config } from "../config.js";
import { collections } from "../db/mongo.js";
import { authMiddleware } from "../lib/auth.js";
import { requireStripe } from "../lib/stripe.js";

export const billingRouter = new Hono();

billingRouter.use("*", authMiddleware);

billingRouter.post("/checkout", async (c) => {
  const log = c.get("log");
  const user = c.get("userDoc");
  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }

  if (!config.stripe.pricePremium) {
    return c.json({ error: "premium_price_not_configured" }, 503);
  }

  // Reutilizamos el customer si ya existe.
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { clerkId: user.clerkId },
    });
    customerId = customer.id;
    await collections().users.updateOne(
      { clerkId: user.clerkId },
      { $set: { stripeCustomerId: customerId, updatedAt: new Date() } },
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: config.stripe.pricePremium, quantity: 1 }],
    success_url: config.stripe.successUrl,
    cancel_url: config.stripe.cancelUrl,
    metadata: { clerkId: user.clerkId },
    client_reference_id: user.clerkId,
  });

  log.info({ sessionId: session.id }, "stripe_checkout_created");
  return c.json({ url: session.url });
});

billingRouter.post("/portal", async (c) => {
  const user = c.get("userDoc");
  let stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }
  if (!user.stripeCustomerId) {
    return c.json({ error: "no_customer" }, 404);
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: config.stripe.successUrl,
  });
  return c.json({ url: session.url });
});
