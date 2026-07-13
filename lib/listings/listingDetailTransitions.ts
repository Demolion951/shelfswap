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
  const byId = new Map<string, ListingMessageRow>();

  // Keep local messages (including optimistic) until a real server row replaces them.
  for (const m of current) {
    byId.set(m.id, m);
  }
  for (const m of incoming) {
    byId.set(m.id, m);
  }

  const merged = [...byId.values()];
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return dropReplacedOptimisticMessages(merged);
}

/** Remove optimistic placeholders once the server copy of the same message exists. */
export function dropReplacedOptimisticMessages(
  messages: ListingMessageRow[],
): ListingMessageRow[] {
  return messages.filter((m) => {
    if (!m.id.startsWith("optimistic-")) return true;
    return !messages.some((s) => {
      if (s.id.startsWith("optimistic-")) return false;
      if (s.sender_id !== m.sender_id) return false;
      if (s.body !== m.body) return false;
      // Photo-only: match when both have an image (blob URL vs public URL differ).
      if (!m.body && !!(m.image_url) !== !!(s.image_url)) return false;
      return (
        Math.abs(new Date(s.created_at).getTime() - new Date(m.created_at).getTime()) <
        120_000
      );
    });
  });
}

export function hasNewMessageFrom(
  prev: ListingMessageRow[],
  next: ListingMessageRow[],
  senderId: string,
): boolean {
  const prevIds = new Set(prev.map((m) => m.id));
  return next.some((m) => m.sender_id === senderId && !prevIds.has(m.id));
}
