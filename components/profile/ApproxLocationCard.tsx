"use client";

/**
 * Lets the user save a coarse device location for approximate listing distances (no address stored).
 * Location: components/profile/ApproxLocationCard.tsx
 */
import { setMyApproxLocationAction } from "@/app/app/profile/location-actions";
import { MapPin, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

export function ApproxLocationCard() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveRounded(lat: number, lng: number) {
    setError(null);
    setMessage(null);
    const rLat = Math.round(lat * 100) / 100;
    const rLng = Math.round(lng * 100) / 100;
    startTransition(async () => {
      const res = await setMyApproxLocationAction(rLat, rLng);
      if (res.ok) {
        setMessage("Rough area saved. Distances are approximate straight-line km.");
        return;
      }
      setError(res.error);
    });
  }

  function onUseDevice() {
    if (!navigator.geolocation) {
      setError("Location isn’t available in this browser.");
      return;
    }
    setError(null);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveRounded(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setError("We couldn’t read your location. Check browser permissions.");
      },
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 15_000 },
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300/80 shadow-sm">
      <div className="card-body gap-3 p-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="shelfswap-heading text-sm font-semibold">Rough area for distances</h2>
            <p className="text-xs text-base-content/60 leading-snug mt-1">
              We round to ~1 km precision and never show your pin on a map. Sellers set a rough point
              too; you’ll see approximate km away (straight line), not addresses.
            </p>
          </div>
        </div>
        {message ? (
          <div role="status" className="alert alert-success text-xs py-2">
            {message}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="alert alert-error text-xs py-2">
            {error}
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-outline btn-primary btn-sm border-primary/30 gap-2"
          disabled={pending}
          onClick={() => onUseDevice()}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Use device location (approximate)
        </button>
      </div>
    </div>
  );
}
