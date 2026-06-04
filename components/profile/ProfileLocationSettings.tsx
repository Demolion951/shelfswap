"use client";

/**
 * Settings: home area for listings (UK postcode or device GPS). Browse location updates in the background.
 * Location: components/profile/ProfileLocationSettings.tsx
 */
import {
  setMyHomeFromPostcodeAction,
  setMyHomeLocationAction,
} from "@/app/app/profile/location-actions";
import { Home, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  homeAreaLabel: string | null;
  /** When false, page supplies the Location title (Profile → Location). */
  showSectionHeader?: boolean;
};

export function ProfileLocationSettings({
  homeAreaLabel,
  showSectionHeader = true,
}: Props) {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postcodePending, startPostcodeTransition] = useTransition();
  const [devicePending, startDeviceTransition] = useTransition();

  function clearStatus() {
    setMessage(null);
    setError(null);
  }

  function onSavePostcode(e: React.FormEvent) {
    e.preventDefault();
    clearStatus();
    const trimmed = postcode.trim();
    if (!trimmed) {
      setError("Enter your postcode.");
      return;
    }
    startPostcodeTransition(async () => {
      const res = await setMyHomeFromPostcodeAction(trimmed);
      if (res.ok) {
        setMessage("Saved.");
        setPostcode("");
        router.refresh();
        return;
      }
      setError(res.error ?? "Could not save.");
    });
  }

  function onUseDevice() {
    if (!navigator.geolocation) {
      setError("Location isn’t available in this browser.");
      return;
    }
    clearStatus();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rLat = Math.round(pos.coords.latitude * 100) / 100;
        const rLng = Math.round(pos.coords.longitude * 100) / 100;
        startDeviceTransition(async () => {
          const res = await setMyHomeLocationAction(rLat, rLng);
          if (res.ok) {
            setMessage("Saved.");
            router.refresh();
            return;
          }
          setError(res.error ?? "Could not save.");
        });
      },
      () => setError("We couldn’t read your location. Check browser permissions."),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 },
    );
  }

  const pending = postcodePending || devicePending;

  return (
    <div className="space-y-4">
      {showSectionHeader ? (
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide">Location</span>
        </div>
      ) : null}

      <div
        className={
          showSectionHeader
            ? "rounded-xl border border-base-300/80 bg-base-100 p-4 space-y-3"
            : "space-y-3"
        }
      >
        <div className="flex items-start gap-2">
          <Home className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div className="min-w-0">
            <h2 className="shelfswap-heading text-sm font-semibold">Where your books are</h2>
            {homeAreaLabel ? (
              <p className="text-xs text-base-content/80 mt-2">
                Current: <span className="font-medium">{homeAreaLabel}</span>
              </p>
            ) : (
              <p className="text-xs text-base-content/50 mt-2">Not set yet.</p>
            )}
          </div>
        </div>

        <form onSubmit={onSavePostcode} className="space-y-2">
          <label className="form-control w-full">
            <span className="label-text text-xs text-base-content/70">UK postcode</span>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="e.g. TW9 2AA"
              autoComplete="postal-code"
              value={postcode}
              disabled={pending}
              onChange={(e) => setPostcode(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn btn-success btn-outline btn-sm w-full border-success/30"
            disabled={pending}
          >
            {postcodePending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save home area
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost btn-xs w-full text-base-content/60"
          disabled={pending}
          onClick={() => onUseDevice()}
        >
          {devicePending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          Or use this device
        </button>

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
      </div>

      <p className="text-[11px] text-base-content/50 leading-snug">
        We store only a rough area (about 1 km), never your full address. Listings show town or
        area only — not your postcode.
      </p>
    </div>
  );
}
