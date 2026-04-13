import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { formatApproxDistanceKm } from "@/lib/geo/formatDistance";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type {
  ListingMessageRow,
  ListingPickupRow,
  ListingWithRelations,
} from "@/lib/listings/queries";
import type { OpenLibraryBlurb } from "@/lib/books/openLibraryBlurb";
import { BookBlurb } from "@/components/listings/BookBlurb";
import { ListingMessagesThread } from "@/components/listings/ListingMessagesThread";
import { ListingPickupBlock } from "@/components/listings/ListingPickupBlock";
import { ListingUnlockPanel } from "@/components/listings/ListingUnlockPanel";
import { ListingViewTracker } from "@/components/listings/ListingViewTracker";
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
  viewerSaved: boolean;
  creditBalance: number;
  currentUserId: string | null;
  pickup: ListingPickupRow | null;
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
  currentUserId,
  pickup,
  messages,
  distanceKm,
  blurb,
}: Props) {
  const photos = sortPhotos(listing);
  const seller = listing.profiles?.display_name ?? "Seller";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const distanceLine =
    !isOwner && isSignedIn ? formatApproxDistanceKm(distanceKm) : null;

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

      <div className="flex items-start gap-2 text-sm text-base-content/70">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
        <span>
          {isOwner
            ? "Buyers see ~km away (approx.) when this listing has a rough area and they save one in Profile. Exact pickup shows after unlock."
            : !isSignedIn
              ? "Sign in and save a rough area in Profile to see approximate distance."
              : distanceLine
                ? `${distanceLine} (approx.)`
                : "~km when Profile and this listing both have a rough area (approx.)."}
        </span>
      </div>

      {listing.description ? (
        <div className="rounded-xl bg-base-100 border border-base-300/80 p-4 text-sm leading-relaxed">
          {listing.description}
        </div>
      ) : null}

      {blurb ? <BookBlurb text={blurb.text} sourceUrl={blurb.sourceUrl} /> : null}

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
          initiallySaved={viewerSaved}
        />
      ) : null}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
