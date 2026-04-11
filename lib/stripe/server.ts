import Stripe from "stripe";

/**
 * Lazy Stripe server client (Node). Do not import from Client Components.
 * Location: lib/stripe/server.ts
 */
let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeSingleton;
}
