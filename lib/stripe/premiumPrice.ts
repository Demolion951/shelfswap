/**
 * Stripe Premium monthly price from env.
 * Location: lib/stripe/premiumPrice.ts
 */
export function stripePremiumPriceId(): string | undefined {
  const v = process.env.STRIPE_PRICE_PREMIUM_MONTHLY?.trim();
  return v || undefined;
}
