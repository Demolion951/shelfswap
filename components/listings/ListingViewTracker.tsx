"use client";

/**
 * Logs a view_listing event once per session per listing.
 * Location: components/listings/ListingViewTracker.tsx
 */
import { logEventAction } from "@/app/app/events/actions";
import { useEffect } from "react";

type Props = { listingId: string; enabled: boolean };

export function ListingViewTracker({ listingId, enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;
    try {
      const key = `ss:viewed:${listingId}`;
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      void logEventAction({ type: "view_listing", listingId });
    } catch {
      void logEventAction({ type: "view_listing", listingId });
    }
  }, [enabled, listingId]);

  return null;
}

