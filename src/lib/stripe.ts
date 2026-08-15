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
 * By default the hardcoded LIVE price IDs are used (created in the owner's
 * live Stripe account, acct_1Ty1eZADHNbdtKNS). Setting
 * NEXT_PUBLIC_STRIPE_MODE=production switches to env-configured price IDs
 * (STRIPE_PRICE_SOLO_SETUP, STRIPE_PRICE_SOLO_MONTHLY, STRIPE_PRICE_TEAM_SETUP,
 * STRIPE_PRICE_TEAM_MONTHLY) — kept for backward compatibility, not used.
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

  // Live mode — price IDs from the owner's live Stripe account (acct_1Ty1eZADHNbdtKNS)
  return {
    SOLO_SETUP: "price_1TyY95ADHNbdtKNSdZYrvGV7", // Founder onboarding $2,500
    SOLO_MONTHLY: "price_1TyY65ADHNbdtKNS9M83pmJc", // Founder monthly $249/mo
    TEAM_SETUP: "price_1TyYD6ADHNbdtKNSgbvfZQ6A",   // Studio onboarding $5,000
    TEAM_MONTHLY: "price_1TyYB3ADHNbdtKNSacUZufAC", // Studio monthly $499/mo
  }
}

/**
 * Maps plan names to Stripe Price IDs.
 * Uses live-mode IDs by default; set NEXT_PUBLIC_STRIPE_MODE=production
 * and the corresponding STRIPE_PRICE_* env vars to override.
 */
export const PRICE_ID_MAP: Record<string, string> = getPriceIdMap();