"use client";

/**
 * Text-only listing row (no image) for dense browsing.
 * Location: components/listings/ListingTextRow.tsx
 */
import { formatUnlockCredits } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

type Props = {
  listing: ListingWithRelations;
};

export function ListingTextRow({ listing }: Props) {
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  return (
    <Link
      href={`/app/listings/${listing.id}`}
      className="card card-compact bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30"
    >
      <div className="card-body p-3 gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="shelfswap-heading line-clamp-1 text-sm font-semibold">
              {listing.title}
            </h3>
            {listing.author ? (
              <p className="line-clamp-1 text-[11px] text-base-content/55">{listing.author}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
            {formatUnlockCredits(credits)}
          </span>
        </div>
        <p className="text-[11px] text-base-content/45">
          @{listing.profiles?.display_name?.trim() || "member"}
        </p>
      </div>
    </Link>
  );
}

