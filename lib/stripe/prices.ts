/**
 * Maps pack id → Stripe Price ID from env (create prices in Stripe Dashboard, test mode OK).
 * Location: lib/stripe/prices.ts
 */
const ENV_KEYS: Record<string, string> = {
  single: "STRIPE_PRICE_SINGLE",
  five: "STRIPE_PRICE_FIVE",
  bundle: "STRIPE_PRICE_BUNDLE",
};

export function stripePriceIdForPack(packId: string): string | undefined {
  const envName = ENV_KEYS[packId];
  if (!envName) return undefined;
  const v = process.env[envName]?.trim();
  return v || undefined;
}
