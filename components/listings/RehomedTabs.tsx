"use client";

/**
 * Pickups / Swaps toggle for Profile → Rehomed (main title stays on the page).
 * Location: components/listings/RehomedTabs.tsx
 */
import { RehomedListingRow } from "@/components/listings/RehomedListingRow";
import type { RehomedListing } from "@/lib/listings/queries";
import { useState } from "react";

type Tab = "pickup" | "swap";

type Props = {
  pickups: RehomedListing[];
  swaps: RehomedListing[];
};

function defaultTab(pickups: RehomedListing[], swaps: RehomedListing[]): Tab {
  if (swaps.length > 0 && pickups.length === 0) return "swap";
  return "pickup";
}

function RehomedList({ listings, emptyText }: { listings: RehomedListing[]; emptyText: string }) {
  if (listings.length === 0) {
    return <p className="text-sm text-base-content/50 pt-1">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-4 pt-1">
      {listings.map((l) => (
        <li key={l.id}>
          <RehomedListingRow listing={l} />
        </li>
      ))}
    </ul>
  );
}

export function RehomedTabs({ pickups, swaps }: Props) {
  const [tab, setTab] = useState<Tab>(() => defaultTab(pickups, swaps));
  const active = tab === "pickup" ? pickups : swaps;

  return (
    <div className="space-y-4">
      <div
        className="join w-full grid grid-cols-2"
        role="tablist"
        aria-label="Rehomed category"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pickup"}
          className={`btn btn-sm join-item w-full gap-2 font-medium ${
            tab === "pickup" ? "btn-primary" : "btn-ghost border border-base-300/80"
          }`}
          onClick={() => setTab("pickup")}
        >
          <span className="shelfswap-heading text-base">Pickups</span>
          <span className="badge badge-sm tabular-nums min-w-[1.25rem]">{pickups.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "swap"}
          className={`btn btn-sm join-item w-full gap-2 font-medium ${
            tab === "swap" ? "btn-secondary" : "btn-ghost border border-base-300/80"
          }`}
          onClick={() => setTab("swap")}
        >
          <span className="shelfswap-heading text-base">Swaps</span>
          <span className="badge badge-sm tabular-nums min-w-[1.25rem]">{swaps.length}</span>
        </button>
      </div>

      <div role="tabpanel">
        {tab === "pickup" ? (
          <RehomedList listings={active} emptyText="No completed pickup sales yet." />
        ) : (
          <RehomedList listings={active} emptyText="No completed swaps yet." />
        )}
      </div>
    </div>
  );
}
