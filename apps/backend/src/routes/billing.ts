import Stripe from "stripe";
import { Hono } from "hono";
import { config } from "../config.js";
import { collections } from "../db/mongo.js";
import { authMiddleware, clerk } from "../lib/auth.js";
import { requireStripe } from "../lib/stripe.js";

export const billingRouter = new Hono();

billingRouter.use("*", authMiddleware);

function stripeErrMsg(err: unknown): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.code ?? err.type ?? err.message;
  }
  return String(err);
}

function isRealEmail(v: string): boolean {
  if (!v || v.includes("{{")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Obtiene el email real del usuario desde Clerk si no está en la DB. */
async function resolveEmail(clerkId: string, storedEmail: string): Promise<string> {
  // Solo usamos el email guardado si es un email real (no una variable de template).
  if (isRealEmail(storedEmail)) return storedEmail;
  if (!clerk) return "";
  try {
    const u = await clerk.users.getUser(clerkId);
    return (
      u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        ?.emailAddress ?? ""
    );
  } catch (err) {
    console.error("[billing] resolveEmail clerk error:", String(err));
    return "";
  }
}

billingRouter.post("/checkout", async (c) => {
  const log = c.get("log");
  const user = c.get("userDoc");
  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }
  if (!config.stripe.pricePremium) {
    return c.json({ error: "premium_price_not_configured" }, 503);
  }

  try {
    const email = await resolveEmail(user.clerkId, user.email);
    log.info(
      { clerkId: user.clerkId, hasEmail: !!email, storedCustomer: !!user.stripeCustomerId },
      "billing_checkout_start",
    );

    // ── Resolver/validar customer de Stripe ─────────────────────────────────
    let customerId: string | undefined = user.stripeCustomerId ?? undefined;

    if (customerId) {
      // Verificar que el customer siga siendo válido en Stripe.
      let existing: Stripe.Customer | Stripe.DeletedCustomer | undefined;
      try {
        existing = await stripe.customers.retrieve(customerId) as
          | Stripe.Customer
          | Stripe.DeletedCustomer;
      } catch {
        existing = undefined;
      }

      if (!existing || "deleted" in existing) {
        // Customer borrado en Stripe → limpiar referencia.
        customerId = undefined;
        await collections().users.updateOne(
          { clerkId: user.clerkId },
          { $set: { stripeCustomerId: null, updatedAt: new Date() } },
        );
        log.warn({ clerkId: user.clerkId }, "stripe_customer_invalid_cleared");
      } else {
        const customerEmail = existing.email ?? "";
        // Si el customer tiene email vacío/inválido y tenemos uno bueno → actualizar.
        if (email && !customerEmail) {
          await stripe.customers.update(customerId, { email });
          log.info({ customerId }, "stripe_customer_email_fixed");
        } else if (!email && !customerEmail) {
          // Sin email en ningún sitio: descartamos el customer para que Stripe
          // cree uno nuevo con el email que el usuario escriba en el checkout.
          customerId = undefined;
          await collections().users.updateOne(
            { clerkId: user.clerkId },
            { $set: { stripeCustomerId: null, updatedAt: new Date() } },
          );
          log.warn({ clerkId: user.clerkId }, "stripe_customer_no_email_reset");
        }
      }
    }

    if (!customerId && email) {
      // Crear nuevo customer con email válido.
      const customer = await stripe.customers.create({
        email,
        name: user.name || undefined,
        metadata: { clerkId: user.clerkId },
      });
      customerId = customer.id;
      await collections().users.updateOne(
        { clerkId: user.clerkId },
        { $set: { stripeCustomerId: customerId, updatedAt: new Date() } },
      );
      log.info({ customerId }, "stripe_customer_created");
    }

    // ── Crear sesión de checkout ─────────────────────────────────────────────
    // Si tenemos customerId → lo adjuntamos (Stripe reutiliza el customer).
    // Si no → Stripe creará un customer nuevo y pedirá el email en el formulario;
    //          el webhook checkout.session.completed guardará el nuevo customerId.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: config.stripe.pricePremium, quantity: 1 }],
      success_url: config.stripe.successUrl,
      cancel_url: config.stripe.cancelUrl,
      metadata: { clerkId: user.clerkId },
      client_reference_id: user.clerkId,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (email) {
      // Fallback: prefill email sin customer object.
      sessionParams.customer_email = email;
    }
    // Si no hay customer ni email → Stripe pedirá el email en el checkout.

    const session = await stripe.checkout.sessions.create(sessionParams);
    log.info({ sessionId: session.id, hasCustomer: !!customerId }, "stripe_checkout_created");
    return c.json({ url: session.url });

  } catch (err) {
    const msg = stripeErrMsg(err);
    log.error({ err: String(err), stripeCode: msg }, "stripe_checkout_error");
    return c.json({ error: msg }, 502);
  }
});

/**
 * POST /api/billing/sync
 * Consulta Stripe directamente para saber si el usuario tiene suscripción activa
 * y sincroniza premiumActive en MongoDB. Útil tras un checkout exitoso cuando
 * el webhook no puede llegar a localhost en desarrollo.
 */
billingRouter.post("/sync", async (c) => {
  const log = c.get("log");
  const user = c.get("userDoc");
  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }

  try {
    let premiumActive = false;
    let stripeCustomerId = user.stripeCustomerId ?? undefined;

    // Si no tenemos customerId, buscar en Stripe por metadata.clerkId
    if (!stripeCustomerId) {
      const customers = await stripe.customers.search({
        query: `metadata['clerkId']:'${user.clerkId}'`,
        limit: 1,
      });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      }
    }

    if (stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
      });

      premiumActive = subscriptions.data.some(
        (s) => s.status === "active" || s.status === "trialing",
      );

      // Actualizar MongoDB con el estado real.
      await collections().users.updateOne(
        { clerkId: user.clerkId },
        {
          $set: {
            premiumActive,
            stripeCustomerId,
            updatedAt: new Date(),
          },
        },
      );

      log.info(
        { clerkId: user.clerkId, premiumActive, stripeCustomerId },
        "billing_sync_done",
      );
    }

    return c.json({ premiumActive });
  } catch (err) {
    const msg = stripeErrMsg(err);
    log.error({ err: String(err) }, "billing_sync_error");
    return c.json({ error: msg }, 502);
  }
});

billingRouter.post("/portal", async (c) => {
  const log = c.get("log");
  const user = c.get("userDoc");
  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return c.json({ error: "stripe_not_configured" }, 503);
  }
  if (!user.stripeCustomerId) {
    return c.json({ error: "no_customer" }, 404);
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: config.stripe.successUrl,
    });
    return c.json({ url: session.url });
  } catch (err) {
    const msg = stripeErrMsg(err);
    log.error({ err: String(err), stripeCode: msg }, "stripe_portal_error");
    return c.json({ error: msg }, 502);
  }
});
