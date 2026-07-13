import { ListingDetailInteractive } from "@/components/listings/ListingDetailInteractive";
import type { UnlockDeal } from "@/components/listings/DealPanel";
import type { PendingUnlockRequest } from "@/components/listings/UnlockRequestsPanel";
import type { BookBlurb } from "@/lib/books/openLibraryBlurb";
import type { ListingMessageRow, ListingWithRelations, UnlockedBuyerRow } from "@/lib/listings/queries";

/**
 * Book / listing detail: locked preview for buyers; messages after unlock (or for seller).
 * Location: components/listings/ListingDetailView.tsx
 */
type Props = {
  listing: ListingWithRelations & { status?: string };
  isOwner: boolean;
  isSignedIn: boolean;
  viewerUnlocked: boolean;
  viewerSaved: boolean;
  creditBalance: number;
  heldCredits: number;
  viewerPendingUnlock: boolean;
  pendingRequestsForSeller: PendingUnlockRequest[];
  unlockDeal: UnlockDeal | null;
  buyerOfferOptions: Array<{ id: string; title: string }>;
  currentUserId: string | null;
  messages: ListingMessageRow[];
  distanceKm: number | null;
  creditsPendingSellerReply?: boolean;
  initialBlurb?: BookBlurb | null;
  sellerActiveListingCount?: number;
  initialUnlockedBuyers?: UnlockedBuyerRow[];
};

export function ListingDetailView(props: Props) {
  return <ListingDetailInteractive {...props} />;
}
