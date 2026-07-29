import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  return key;
}

/**
 * Returns the Stripe client instance (lazy-initialized).
 * Throws at call time if STRIPE_SECRET_KEY is not set.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey(), {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Maps plan names to Stripe Price IDs.
 * Prices are in test mode.
 */
export const PRICE_ID_MAP: Record<string, string> = {
  SOLO_SETUP: "price_1TwjynDTYPATv6KzoIOmjHg1", // $2,500
  SOLO_MONTHLY: "price_1Twju9DTYPATv6KzMjIYaJkt", // $249/mo
  TEAM_SETUP: "price_1TwjynDTYPATv6Kzv5ulQbRS", // $5,000
  TEAM_MONTHLY: "price_1Twju9DTYPATv6KzmRA9PZXi", // $499/mo
};