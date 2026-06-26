/** Binding type stored in listings.unlock_credits (1 = paperback, 2 = hardback). */
export function formatBindingType(unlockCredits: number): string {
  return unlockCredits === 2 ? "Hardback" : "Paperback";
}

/** @deprecated Credits removed — use formatBindingType for listing cards. */
export function formatUnlockCredits(credits: number): string {
  const n = credits === 2 ? 2 : 1;
  return n === 1 ? "1 credit" : "2 credits";
}

export const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  acceptable: "Acceptable",
};
