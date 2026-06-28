"use client";

/**
 * Seller picks which buyer conversation to view on a listing (Marketplace-style multi-chat).
 * Location: components/listings/ListingBuyerThreadPicker.tsx
 */
type BuyerThread = {
  buyerId: string;
  handle: string;
};

type Props = {
  buyers: BuyerThread[];
  activeBuyerId: string | null;
  onSelect: (buyerId: string) => void;
};

export function ListingBuyerThreadPicker({ buyers, activeBuyerId, onSelect }: Props) {
  if (buyers.length <= 1) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-base-content/55">Conversations</p>
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Buyer conversations">
        {buyers.map((b) => {
          const active = b.buyerId === activeBuyerId;
          return (
            <button
              key={b.buyerId}
              type="button"
              role="tab"
              aria-selected={active}
              className={`btn btn-xs rounded-full ${
                active ? "btn-primary" : "btn-ghost border border-base-300/80"
              }`}
              onClick={() => onSelect(b.buyerId)}
            >
              @{b.handle}
            </button>
          );
        })}
      </div>
    </div>
  );
}
