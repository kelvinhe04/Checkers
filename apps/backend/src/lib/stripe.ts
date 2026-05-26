import Stripe from "stripe";
import { config } from "../config.js";

export const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, {
      apiVersion: "2024-09-30.acacia",
    })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error("stripe_not_configured");
  }
  return stripe;
}
