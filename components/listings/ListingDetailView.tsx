import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { formatApproxDistanceKm } from "@/lib/geo/formatDistance";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type {
  ListingMessageRow,
  ListingPickupRow,
  ListingWithRelations,
} from "@/lib/listings/queries";
import { ListingMessagesThread } from "@/components/listings/ListingMessagesThread";
import { ListingPickupBlock } from "@/components/listings/ListingPickupBlock";
import { ListingUnlockPanel } from "@/components/listings/ListingUnlockPanel";
import { MapPin } from "lucide-react";
import Link from "next/link";

/**
 * Book / listing detail: locked preview for buyers; pickup + messages after unlock (or for seller).
 * Location: components/listings/ListingDetailView.tsx
 */
type Props = {
  listing: ListingWithRelations & { status?: string };
  isOwner: boolean;
  isSignedIn: boolean;
  viewerUnlocked: boolean;
  creditBalance: number;
  currentUserId: string | null;
  pickup: ListingPickupRow | null;
  messages: ListingMessageRow[];
  distanceKm: number | null;
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
  creditBalance,
  currentUserId,
  pickup,
  messages,
  distanceKm,
}: Props) {
  const photos = sortPhotos(listing);
  const seller = listing.profiles?.display_name ?? "Seller";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const distanceLine =
    !isOwner && isSignedIn ? formatApproxDistanceKm(distanceKm) : null;

  return (
    <div className="space-y-4 pb-8">
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

      <div className="flex items-start gap-2 text-sm text-base-content/70">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
        <span>
          {isOwner ? (
            <>
              Approximate straight-line distance (km) is shown to buyers whenever both sides have a
              saved rough area—we never show a precise address or map pin here. Exact pickup notes
              stay unlock-only below.
            </>
          ) : distanceLine ? (
            <>
              <span className="font-medium text-base-content">{distanceLine}</span> from your saved
              rough area (straight line, not driving time). Exact pickup text is only after unlock
              below—we still never show the seller&apos;s precise address on the map.
            </>
          ) : isSignedIn ? (
            <>
              We always use approximate straight-line km, never a precise address. You don&apos;t
              see a number yet because your Profile rough area or the seller&apos;s listing area
              isn&apos;t set—add yours in Profile; exact pickup stays unlock-only below.
            </>
          ) : (
            <>
              We show approximate straight-line km (never a precise address) after you sign in and
              save a rough area in Profile. Exact pickup details stay unlock-only below.
            </>
          )}
        </span>
      </div>

      {listing.description ? (
        <div className="rounded-xl bg-base-100 border border-base-300/80 p-4 text-sm leading-relaxed">
          {listing.description}
        </div>
      ) : null}

      <p className="text-sm text-base-content/60">
        Listed by <span className="font-medium text-base-content">@{seller}</span>
      </p>

      {isOwner || viewerUnlocked ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">
              Pickup &amp; coordination
            </h2>
            {isOwner ? (
              <p className="text-sm text-base-content/65">
                Add pickup instructions and optional contact hints. Buyers only see this after they
                spend credits to unlock.
              </p>
            ) : (
              <div className="alert alert-success text-sm py-2">
                You&apos;ve unlocked this listing — use the details below to arrange handoff.
              </div>
            )}
            <ListingPickupBlock
              listingId={listing.id}
              isOwner={isOwner}
              initialPickup={pickup}
            />
            <div className="divider my-0" />
            <ListingMessagesThread
              listingId={listing.id}
              messages={messages}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      ) : null}

      {!isOwner ? (
        <ListingUnlockPanel
          listingId={listing.id}
          creditsRequired={credits}
          creditBalance={creditBalance}
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
