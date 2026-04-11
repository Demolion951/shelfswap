/**
 * Maps pack id → Stripe Price ID from env (create prices in Stripe Dashboard, test mode OK).
 * Location: lib/stripe/prices.ts
 */
const ENV_KEYS: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER",
  reader: "STRIPE_PRICE_READER",
  shelf: "STRIPE_PRICE_SHELF",
};

export function stripePriceIdForPack(packId: string): string | undefined {
  const envName = ENV_KEYS[packId];
  if (!envName) return undefined;
  const v = process.env[envName]?.trim();
  return v || undefined;
}
