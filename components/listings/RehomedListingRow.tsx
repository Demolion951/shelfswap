/**
 * Read-only row for a seller’s completed (rehomed) listing on Profile → Listings.
 * Location: components/listings/RehomedListingRow.tsx
 */
import { ListingCard } from "@/components/listings/ListingCard";
import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import type { RehomedListing } from "@/lib/listings/queries";

type Props = {
  listing: RehomedListing;
};

export function RehomedListingRow({ listing }: Props) {
  return (
    <div className="space-y-1">
      <ListingCard listing={listing} variant="row" />
      <p className="text-xs text-base-content/55 pl-1">
        Rehomed{" "}
        <LocalDateTimeText iso={listing.rehomedAt} />
      </p>
    </div>
  );
}
