/**
 * Premium subscription constants.
 * Location: lib/subscription/constants.ts
 */
export const PREMIUM_MONTHLY_GBP = 7.99;
export const FREE_SWAPS_PER_MONTH = 2;

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export function isPremiumStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function formatPremiumPrice(): string {
  return `£${PREMIUM_MONTHLY_GBP.toFixed(2)}`;
}
