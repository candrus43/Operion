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

  // Test mode — price IDs from the app's own Stripe test account (acct_1Ty1eZADHNbdtKNS)
  return {
    SOLO_SETUP: "price_1U4kdDADHNbdtKNSs16OxBB1", // Founder onboarding $2,500
    SOLO_MONTHLY: "price_1U4kdDADHNbdtKNS5PAd2hXM", // Founder monthly $249/mo
    TEAM_SETUP: "price_1U4kdEADHNbdtKNSes4wVyZr",   // Studio onboarding $5,000
    TEAM_MONTHLY: "price_1U4kdDADHNbdtKNSARFrEiSP", // Studio monthly $499/mo
  }
}

/**
 * Maps plan names to Stripe Price IDs.
 * Uses test-mode IDs by default; set NEXT_PUBLIC_STRIPE_MODE=production
 * and the corresponding STRIPE_PRICE_* env vars for live pricing.
 */
export const PRICE_ID_MAP: Record<string, string> = getPriceIdMap();