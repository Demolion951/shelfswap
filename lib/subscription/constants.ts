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

export const FREE_PLAN_BENEFITS = [
  "List books for free",
  "Browse home, search, and saved favourites",
  "View listing details and approximate areas",
  `${FREE_SWAPS_PER_MONTH} swap offers per month`,
] as const;

export const PREMIUM_PLAN_BENEFITS = [
  "Everything in Free",
  "Unlimited unlocks and seller chats",
  "Unlimited swap offers",
  "Book wishlist — get notified when a title you want is listed, then request a chat about it",
  "Cancel anytime",
] as const;
