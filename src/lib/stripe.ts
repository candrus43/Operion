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
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Returns the set of Stripe Price IDs for the current environment.
 *
 * In development/test mode (default) the hardcoded test price IDs are used.
 * Set NEXT_PUBLIC_STRIPE_MODE=production in production to use env-configured
 * production price IDs (STRIPE_PRICE_SOLO_SETUP, STRIPE_PRICE_SOLO_MONTHLY,
 * STRIPE_PRICE_TEAM_SETUP, STRIPE_PRICE_TEAM_MONTHLY).
 */
function getPriceIdMap(): Record<string, string> {
  const mode = process.env.NEXT_PUBLIC_STRIPE_MODE

  if (mode === "production") {
    return {
      SOLO_SETUP: process.env.STRIPE_PRICE_SOLO_SETUP || "",
      SOLO_MONTHLY: process.env.STRIPE_PRICE_SOLO_MONTHLY || "",
      TEAM_SETUP: process.env.STRIPE_PRICE_TEAM_SETUP || "",
      TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY || "",
    }
  }

  // Test mode — hardcoded development price IDs
  return {
    SOLO_SETUP: "price_1TwjynDTYPATv6KzoIOmjHg1", // $2,500
    SOLO_MONTHLY: "price_1Twju9DTYPATv6KzMjIYaJkt", // $249/mo
    TEAM_SETUP: "price_1TwjynDTYPATv6Kzv5ulQbRS",   // $5,000
    TEAM_MONTHLY: "price_1Twju9DTYPATv6KzmRA9PZXi", // $499/mo
  }
}

/**
 * Maps plan names to Stripe Price IDs.
 * Uses test-mode IDs by default; set NEXT_PUBLIC_STRIPE_MODE=production
 * and the corresponding STRIPE_PRICE_* env vars for live pricing.
 */
export const PRICE_ID_MAP: Record<string, string> = getPriceIdMap();