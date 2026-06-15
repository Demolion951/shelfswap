/**
 * Pure state transitions for listing detail unlock / deal UI (optimistic updates).
 * Location: lib/listings/listingDetailTransitions.ts
 */
import type { UnlockDeal } from "@/components/listings/DealPanel";
import type { PendingUnlockRequest } from "@/components/listings/UnlockRequestsPanel";
import type { ListingMessageRow } from "@/lib/listings/queries";

export function createUnlockDealFromRequest(req: PendingUnlockRequest): UnlockDeal {
  return {
    buyerId: req.buyerId,
    dealType: "pickup",
    swapStatus: null,
    offeredListingId: null,
    offeredTitle: null,
    offeredCredits: null,
    creditsSpent: req.creditsHeld,
    swapCreditsRefunded: 0,
    buyerConfirmedAt: null,
    sellerConfirmedAt: null,
    completedAt: null,
    unlockCreatedAt: new Date().toISOString(),
    buyerMutualCancelAt: null,
    sellerMutualCancelAt: null,
  };
}

/** Seller sent a message — accepts oldest pending request (FIFO) in the database. */
export function applySellerSentMessage(input: {
  pendingRequests: PendingUnlockRequest[];
  unlockDeal: UnlockDeal | null;
}): { pendingRequests: PendingUnlockRequest[]; unlockDeal: UnlockDeal | null } {
  if (input.pendingRequests.length === 0) {
    return { pendingRequests: input.pendingRequests, unlockDeal: input.unlockDeal };
  }
  const first = input.pendingRequests[0];
  return {
    pendingRequests: [],
    unlockDeal: input.unlockDeal ?? createUnlockDealFromRequest(first),
  };
}

/** Buyer observes seller's first reply — unlock is live and credits are charged. */
export function applyBuyerObservedSellerReply(): {
  viewerUnlocked: boolean;
  viewerPendingUnlock: boolean;
  creditsPendingSellerReply: boolean;
} {
  return {
    viewerUnlocked: true,
    viewerPendingUnlock: false,
    creditsPendingSellerReply: false,
  };
}

export function mergeMessages(
  current: ListingMessageRow[],
  incoming: ListingMessageRow[],
): ListingMessageRow[] {
  if (incoming.length === 0) return current;
  const byId = new Map<string, ListingMessageRow>();
  for (const m of current) {
    if (!m.id.startsWith("optimistic-")) byId.set(m.id, m);
  }
  for (const m of incoming) {
    byId.set(m.id, m);
  }
  const merged = [...byId.values()];
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return merged;
}

export function hasNewMessageFrom(
  prev: ListingMessageRow[],
  next: ListingMessageRow[],
  senderId: string,
): boolean {
  const prevIds = new Set(prev.map((m) => m.id));
  return next.some((m) => m.sender_id === senderId && !prevIds.has(m.id));
}
