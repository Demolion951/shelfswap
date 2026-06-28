/**
 * Seller display name and link to browse their active listings (visible before unlock).
 * Location: components/listings/SellerListingLink.tsx
 */
import { Library } from "lucide-react";
import Link from "next/link";

type Props = {
  sellerId: string;
  sellerName: string;
  activeListingCount: number;
};

export function SellerListingLink({ sellerId, sellerName, activeListingCount }: Props) {
  const href = `/app/sellers/${sellerId}`;
  const countLabel =
    activeListingCount === 1 ? "1 active listing" : `${activeListingCount} active listings`;

  return (
    <div className="space-y-1 min-w-0">
      <p className="text-sm text-base-content/60">
        Listed by{" "}
        <Link href={href} className="font-medium text-base-content link link-hover link-primary">
          @{sellerName}
        </Link>
      </p>
      {activeListingCount > 0 ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary link link-hover"
        >
          <Library className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Browse {countLabel}
        </Link>
      ) : null}
    </div>
  );
}
