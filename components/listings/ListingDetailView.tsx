import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import {
  approxDistanceAlwaysVisibleLine,
  formatApproxDistanceKm,
} from "@/lib/geo/formatDistance";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type { ListingMessageRow, ListingWithRelations } from "@/lib/listings/queries";
import type { OpenLibraryBlurb } from "@/lib/books/openLibraryBlurb";
import { BookBlurb } from "@/components/listings/BookBlurb";
import { ListingSaveHeart } from "@/components/listings/ListingSaveHeart";
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
    buyerConfirmedAt: string | null;
    sellerConfirmedAt: string | null;
    completedAt: string | null;
  } | null;
  buyerOfferOptions: Array<{ id: string; title: string }>;
  currentUserId: string | null;
  messages: ListingMessageRow[];
  distanceKm: number | null;
  blurb: OpenLibraryBlurb | null;
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
  distanceKm,
  blurb,
}: Props) {
  const photos = sortPhotos(listing);
  const seller = listing.profiles?.display_name?.trim() || "member";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const distanceLine =
    !isOwner && isSignedIn ? formatApproxDistanceKm(distanceKm) : null;
  const town = listing.approx_area_text?.trim() || null;
  const buyerDistanceText =
    !isOwner && isSignedIn
      ? distanceLine ?? approxDistanceAlwaysVisibleLine(distanceKm)
      : null;
  const buyerHasApproxKm = !isOwner && isSignedIn && distanceLine != null;

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
              src={coverImageSrcForDisplay(listing.cover_url) ?? listing.cover_url}
              alt=""
              className="max-h-80 w-full rounded-lg object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}
        {photos.length === 0 && !listing.cover_url ? (
          <div className="carousel-item flex min-h-[14rem] w-full items-center justify-center rounded-lg bg-base-300/40 text-sm text-base-content/45">
            No cover image for this listing
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
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

      {!isOwner ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-sm text-base-content/70">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
            <span>
              {!isSignedIn ? (
                "Sign in and allow approximate location to see distance hints."
              ) : buyerDistanceText ? (
                <span className="block text-sm leading-snug text-base-content/80">
                  {town ? (
                    <>
                      {town}{" "}
                      <span
                        className={
                          buyerHasApproxKm ? "text-secondary" : "text-base-content/65"
                        }
                      >
                        ({buyerDistanceText})
                      </span>
                    </>
                  ) : (
                    <span
                      className={buyerHasApproxKm ? "text-secondary" : "text-base-content/70"}
                    >
                      {buyerDistanceText}
                    </span>
                  )}
                </span>
              ) : null}
            </span>
          </div>
          {isSignedIn && viewerUnlocked ? (
            <ListingSaveHeart listingId={listing.id} initiallySaved={viewerSaved} />
          ) : null}
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

      {blurb ? <BookBlurb text={blurb.text} /> : null}

      {isOwner || viewerUnlocked ? (
        <p className="text-sm text-base-content/60">
          Listed by <span className="font-medium text-base-content">@{seller}</span>
        </p>
      ) : (
        <p className="text-sm text-base-content/50">Seller name hidden until unlock</p>
      )}

      {isOwner || viewerUnlocked ? (
        <>
          {isOwner ? (
            <UnlockRequestsPanel listingId={listing.id} requests={pendingRequestsForSeller} />
          ) : null}
          {unlockDeal ? (
            <DealPanel
              listingId={listing.id}
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
              <div className="alert alert-success text-sm py-2">
                You&apos;ve unlocked this listing — chat below to arrange handoff.
              </div>
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
          initiallySaved={viewerSaved}
        />
      ) : null}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
