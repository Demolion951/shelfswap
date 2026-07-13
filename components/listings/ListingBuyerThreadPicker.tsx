"use client";

/**
 * Seller picks which buyer conversation to view on a listing (Marketplace-style multi-chat).
 * Shows karma badges; list order is recent activity then trust tier (from server).
 * Location: components/listings/ListingBuyerThreadPicker.tsx
 */
import { ProfileKarmaBadge } from "@/components/profile/ProfileKarmaBadge";
import type { KarmaStats } from "@/lib/profile/karma";

type BuyerThread = {
  buyerId: string;
  handle: string;
  karma: KarmaStats;
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
              className={`btn btn-xs h-auto min-h-7 rounded-full gap-1.5 py-1 ${
                active ? "btn-primary" : "btn-ghost border border-base-300/80"
              }`}
              onClick={() => onSelect(b.buyerId)}
            >
              <ProfileKarmaBadge stats={b.karma} />
              <span>@{b.handle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
