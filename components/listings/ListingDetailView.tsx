import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { Heart, Lock, MapPin } from "lucide-react";
import Link from "next/link";

/**
 * Book / listing detail: locked preview for buyers; full notes for owners.
 * Location: components/listings/ListingDetailView.tsx
 */
type Props = {
  listing: ListingWithRelations & { status?: string };
  isOwner: boolean;
};

function sortPhotos(listing: ListingWithRelations) {
  const p = listing.listing_photos ?? [];
  return [...p].sort((a, b) => a.sort - b.sort);
}

export function ListingDetailView({ listing, isOwner }: Props) {
  const photos = sortPhotos(listing);
  const seller = listing.profiles?.display_name ?? "Seller";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;

  return (
    <div className="space-y-4 pb-8">
      <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
        {photos.map((ph) => (
          <div
            key={ph.id}
            className="carousel-item w-[85%] max-w-sm first:pl-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ph.url}
              alt=""
              className="max-h-80 w-full rounded-lg object-contain bg-base-300/30"
            />
          </div>
        ))}
        {photos.length === 0 && listing.cover_url ? (
          <div className="carousel-item w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.cover_url}
              alt=""
              className="max-h-80 w-full rounded-lg object-contain"
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

      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        <span>Approx. distance shown after we add your location (coming next).</span>
      </div>

      {listing.description ? (
        <div className="rounded-xl bg-base-100 border border-base-300/80 p-4 text-sm leading-relaxed">
          {listing.description}
        </div>
      ) : null}

      <p className="text-sm text-base-content/60">
        Listed by <span className="font-medium text-base-content">@{seller}</span>
      </p>

      {isOwner ? (
        <div className="alert alert-success text-sm">
          This is your listing — exact pickup location and buyer chat will appear here after
          someone unlocks (credits phase).
        </div>
      ) : (
        <div className="card bg-base-100 border border-primary/20 shadow-md">
          <div className="card-body gap-3">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-5 w-5 text-primary shrink-0" aria-hidden />
              <div>
                <h2 className="font-semibold">
                  Unlock for {formatUnlockCredits(credits)}
                </h2>
                <p className="text-sm text-base-content/65">
                  Reveal exact pickup spot and start a chat to arrange collection. Wallet and
                  unlock flow are next on the roadmap.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-outline gap-2" disabled>
                Unlock (soon)
              </button>
              <button type="button" className="btn btn-ghost btn-sm gap-1" disabled title="Soon">
                <Heart className="h-4 w-4" aria-hidden />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
