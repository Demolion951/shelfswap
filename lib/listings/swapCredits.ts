/**
 * Net unlock cost for an accepted swap: seller listing credits minus offered listing credits (min 0).
 * Location: lib/listings/swapCredits.ts
 */
export function normalizeUnlockCredits(value: unknown): 1 | 2 {
  return value === 2 || value === "2" ? 2 : 1;
}

export function swapNetCredits(sellerCredits: number, offeredCredits: number): number {
  const seller = normalizeUnlockCredits(sellerCredits);
  const offered = normalizeUnlockCredits(offeredCredits);
  return Math.max(0, seller - offered);
}

export function swapEstimatedRefund(
  creditsSpent: number,
  sellerCredits: number,
  offeredCredits: number | null,
): number {
  const net = swapNetCredits(sellerCredits, offeredCredits ?? 1);
  return Math.max(0, creditsSpent - net);
}
