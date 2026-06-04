/**
 * One category block on Profile → Rehomed (pickup sales or swaps).
 * Location: components/listings/RehomedSection.tsx
 */
import { RehomedListingRow } from "@/components/listings/RehomedListingRow";
import type { RehomedListing } from "@/lib/listings/queries";
import { Shuffle, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  listings: RehomedListing[];
  icon: "pickup" | "swap";
  emptyText: string;
};

const ICONS: Record<Props["icon"], LucideIcon> = {
  pickup: ShoppingBag,
  swap: Shuffle,
};

export function RehomedSection({ title, description, listings, icon, emptyText }: Props) {
  const Icon = ICONS[icon];
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon
          className={`h-5 w-5 shrink-0 ${icon === "swap" ? "text-secondary" : "text-primary"}`}
          aria-hidden
        />
        <h2 className="shelfswap-heading text-lg font-semibold">{title}</h2>
        <span className="badge badge-ghost badge-sm tabular-nums">{listings.length}</span>
      </div>
      <p className="text-sm text-base-content/60">{description}</p>
      {listings.length === 0 ? (
        <p className="text-sm text-base-content/50">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {listings.map((l) => (
            <li key={l.id}>
              <RehomedListingRow listing={l} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
