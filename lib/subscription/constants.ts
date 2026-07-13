/**
 * Plan constants: launch is fully free; Premium perks coming later.
 * Location: lib/subscription/constants.ts
 */
export const PREMIUM_MONTHLY_GBP = 7.99;
export const LAUNCH_FREE_MODE = true;

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

/** What everyone gets during launch (the standard product). */
export const STANDARD_PLAN_BENEFITS = [
  "List unlimited books for free",
  "Browse, search, and save favourites",
  "Message sellers on any listing",
  "Unlimited swap offers",
  "Open to swaps on your listings",
  "Build karma from completed handoffs",
] as const;

/** Shown as coming soon on the Plan page. */
export const COMING_SOON_PREMIUM_BENEFITS = [
  "Book wishlist with match notifications",
  "No ads",
  "Invites to monthly meetups & socials",
  "Premium badge on your profile",
  "Extra visibility when messaging sellers",
] as const;

/** @deprecated Launch mode — kept for legacy Stripe subscribers UI. */
export const FREE_PLAN_BENEFITS = STANDARD_PLAN_BENEFITS;

/** @deprecated Premium not sold during launch. */
export const PREMIUM_PLAN_BENEFITS = COMING_SOON_PREMIUM_BENEFITS;

/** @deprecated Unlimited swaps during launch. */
export const FREE_SWAPS_PER_MONTH = 999;
