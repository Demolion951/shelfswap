import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { listingAreaLine } from "@/lib/listings/areaDisplay";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type { ListingMessageRow, ListingWithRelations } from "@/lib/listings/queries";
import { OpenLibraryBlurbLoader } from "@/components/listings/OpenLibraryBlurbLoader";
import { ListingSaveHeart } from "@/components/listings/ListingSaveHeart";
import { DealHandoffPanel } from "@/components/listings/DealHandoffPanel";
import { DealPanel } from "@/components/listings/DealPanel";
import { ListingMessagesThread } from "@/components/listings/ListingMessagesThread";
import { ListingUnlockPanel } from "@/components/listings/ListingUnlockPanel";
import { ListingViewTracker } from "@/components/listings/ListingViewTracker";
import { UnlockRequestsPanel, type PendingUnlockRequest } from "@/components/listings/UnlockRequestsPanel";
import { MapPin } from "lucide-react";
import Link from "next/link";

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
  unlockDeal: {
    buyerId: string;
    dealType: "pickup" | "swap";
    swapStatus: "proposed" | "accepted" | "declined" | null;
    offeredListingId: string | null;
    offeredTitle: string | null;
    offeredCredits: number | null;
    creditsSpent: number;
    swapCreditsRefunded: number;
    buyerConfirmedAt: string | null;
    sellerConfirmedAt: string | null;
    completedAt: string | null;
  } | null;
  buyerOfferOptions: Array<{ id: string; title: string }>;
  currentUserId: string | null;
  messages: ListingMessageRow[];
  distanceKm: number | null;
  /** True when unlock is live but DB has not yet debited credits (until seller’s first message). */
  creditsPendingSellerReply?: boolean;
};

function sortPhotos(listing: ListingWithRelations) {
  const p = listing.listing_photos ?? [];
  return [...p].sort((a, b) => a.sort - b.sort);
}

export function ListingDetailView({
  listing,
  isOwner,
  isSignedIn,
  viewerUnlocked,
  viewerSaved,
  creditBalance,
  heldCredits,
  viewerPendingUnlock,
  pendingRequestsForSeller,
  unlockDeal,
  buyerOfferOptions,
  currentUserId,
  messages,
  distanceKm: _distanceKm,
  creditsPendingSellerReply = false,
}: Props) {
  const photos = sortPhotos(listing);
  const seller = listing.profiles?.display_name?.trim() || "member";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const isbnDigits = listing.isbn ? listing.isbn.replace(/\D/g, "") : "";
  const isbnCoverUrl =
    isbnDigits.length === 10 || isbnDigits.length === 13
      ? `/api/openlibrary-cover?isbn=${encodeURIComponent(isbnDigits)}&size=L`
      : null;
  const areaLine = !isOwner && isSignedIn ? listingAreaLine(listing.approx_area_text) : null;

  return (
    <div className="space-y-4 pb-8">
      <ListingViewTracker listingId={listing.id} enabled={isSignedIn && !isOwner} />
      <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
        {photos.map((ph) => {
          const src = coverImageSrcForDisplay(ph.url) ?? ph.url;
          return (
            <div
              key={ph.id}
              className="carousel-item w-[85%] max-w-sm first:pl-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="max-h-80 w-full rounded-lg object-contain bg-base-300/30"
                referrerPolicy="no-referrer"
              />
            </div>
          );
        })}
        {photos.length === 0 && listing.cover_url ? (
          <div className="carousel-item w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                // Prefer the ISBN proxy when available (most reliable), otherwise use stored cover_url.
                isbnCoverUrl ??
                coverImageSrcForDisplay(listing.cover_url) ??
                listing.cover_url
              }
              alt=""
              className="max-h-80 w-full rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}
        {photos.length === 0 && !listing.cover_url ? (
          <div className="carousel-item flex min-h-[14rem] w-full items-center justify-center rounded-lg bg-base-300/40 text-sm text-base-content/45">
            {isbnCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={isbnCoverUrl}
                alt=""
                className="max-h-80 w-full rounded-lg object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              "No cover image for this listing"
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="shelfswap-heading text-2xl font-semibold leading-tight">
            {listing.title}
          </h1>
          {listing.author ? (
            <p className="text-base-content/70">{listing.author}</p>
          ) : null}
          {listing.isbn ? (
            <p className="font-mono text-xs text-base-content/50">ISBN {listing.isbn}</p>
          ) : null}
        </div>
        {!isOwner && isSignedIn ? (
          <div className="shrink-0 pt-0.5">
            <ListingSaveHeart listingId={listing.id} initiallySaved={viewerSaved} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-lg badge-ghost border-primary/25 text-primary">
          {cond}
        </span>
        <span className="text-2xl font-bold text-primary">
          {formatUnlockCredits(credits)}
        </span>
        {listing.open_to_swaps ? (
          <span className="badge badge-accent badge-outline">Open to swaps</span>
        ) : null}
      </div>

      {!isOwner && areaLine ? (
        <div className="flex items-start gap-2 text-sm text-base-content/70">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
          <span className="text-sm leading-snug text-base-content/80">{areaLine}</span>
        </div>
      ) : null}

      {listing.description ? (
        <section className="space-y-2" aria-labelledby="listing-seller-notes-heading">
          <h2
            id="listing-seller-notes-heading"
            className="shelfswap-heading text-sm font-semibold text-primary"
          >
            Seller notes
          </h2>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed text-base-content whitespace-pre-wrap">
            {listing.description}
          </div>
        </section>
      ) : null}

      <OpenLibraryBlurbLoader isbn={listing.isbn} />

      {isOwner || viewerUnlocked || viewerPendingUnlock ? (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <p className="text-sm text-base-content/60 min-w-0">
            Listed by <span className="font-medium text-base-content">@{seller}</span>
          </p>
          {unlockDeal ? (
            <DealHandoffPanel listingId={listing.id} currentUserId={currentUserId} deal={unlockDeal} />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-base-content/50">Seller name hidden until unlock</p>
      )}

      {isOwner || viewerUnlocked || viewerPendingUnlock ? (
        <>
          {isOwner ? (
            <UnlockRequestsPanel listingId={listing.id} requests={pendingRequestsForSeller} />
          ) : null}
          {unlockDeal ? (
            <DealPanel
              listingId={listing.id}
              listingTitle={listing.title}
              listingUnlockCredits={credits}
              isOwner={isOwner}
              currentUserId={currentUserId}
              listingOpenToSwaps={!!listing.open_to_swaps}
              deal={unlockDeal}
              myOfferOptions={buyerOfferOptions}
            />
          ) : null}
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">Messages</h2>
            {!isOwner ? (
              unlockDeal?.completedAt ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  This deal is completed. The listing is no longer shown on Home or Browse.
                </p>
              ) : viewerPendingUnlock && !viewerUnlocked ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  When the seller replies, your request is accepted and credits are charged.
                </p>
              ) : creditsPendingSellerReply ? (
                <div className="alert alert-info text-sm py-2">
                  You can message below. Credits are charged when the seller sends their first reply.
                </div>
              ) : (
                <div className="alert alert-success text-sm py-2">
                  You&apos;ve unlocked this listing — chat below to arrange handoff.
                </div>
              )
            ) : unlockDeal?.completedAt ? (
              <p className="text-sm text-base-content/60 leading-snug">
                Deal completed — this listing is archived and hidden from discovery.
              </p>
            ) : null}
            <ListingMessagesThread
              listingId={listing.id}
              messages={messages}
              currentUserId={currentUserId}
            />
          </div>
        </div>
        </>
      ) : null}

      {!isOwner ? (
        <ListingUnlockPanel
          listingId={listing.id}
          creditsRequired={credits}
          creditBalance={creditBalance}
          heldCredits={heldCredits}
          initiallyPending={viewerPendingUnlock}
          isSignedIn={isSignedIn}
          initiallyUnlocked={viewerUnlocked}
        />
      ) : null}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
