import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

/**
 * Compact listing preview for feeds and search — links to detail.
 * Location: components/listings/ListingCard.tsx
 */
type Props = {
  listing: ListingWithRelations;
  /** When true, uses horizontal layout for carousel rows */
  variant?: "grid" | "row";
};

function sortedPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

export function ListingCard({ listing, variant = "grid" }: Props) {
  const photos = sortedPhotos(listing);
  const thumbRaw = photos[0]?.url ?? listing.cover_url;
  const thumb = thumbRaw ? coverImageSrcForDisplay(thumbRaw) ?? thumbRaw : null;
  const seller = listing.profiles?.display_name ?? "Seller";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;

  const inner = (
    <>
      <figure
        className={
          variant === "row"
            ? "relative aspect-[3/4] w-[5.5rem] shrink-0 overflow-hidden bg-base-300"
            : "relative aspect-[3/4] w-full overflow-hidden bg-base-300"
        }
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-base-content/40 px-1 text-center">
            No image
          </div>
        )}
      </figure>
      <div className={variant === "row" ? "min-w-0 flex-1 py-1 pr-2" : "card-body gap-1 p-3"}>
        <h3 className="shelfswap-heading line-clamp-2 text-base font-semibold leading-tight text-base-content">
          {listing.title}
        </h3>
        {listing.author ? (
          <p className="line-clamp-1 text-xs text-base-content/60">{listing.author}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="badge badge-sm badge-ghost border-primary/20 text-primary">
            {cond}
          </span>
          <span className="text-sm font-semibold text-primary">
            {formatUnlockCredits(credits)}
          </span>
          {listing.open_to_swaps ? (
            <span className="badge badge-sm badge-accent badge-outline">Swaps</span>
          ) : null}
        </div>
        <p className="text-xs text-base-content/50">@{seller}</p>
      </div>
    </>
  );

  return (
    <Link
      href={`/app/listings/${listing.id}`}
      className={
        variant === "row"
          ? "card card-side card-compact bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          : "card card-compact bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
      }
    >
      {variant === "row" ? (
        <div className="flex w-full gap-0">{inner}</div>
      ) : (
        <div className="flex flex-col">{inner}</div>
      )}
    </Link>
  );
}
