/** How many credits to unlock this listing (seller-chosen 1 or 2). */
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
