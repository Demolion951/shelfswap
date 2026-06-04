"use client";

/**
 * Settings: home location (fixed on listings) vs browse location (nearby discovery).
 * Location: components/profile/ProfileLocationSettings.tsx
 */
import {
  setMyBrowseLocationAction,
  setMyHomeLocationAction,
} from "@/app/app/profile/location-actions";
import { Home, Loader2, MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  homeAreaLabel: string | null;
  browseAreaLabel: string | null;
};

function useDeviceLocation(
  onSave: (lat: number, lng: number) => Promise<{ ok: boolean; error?: string }>,
  onSuccess?: () => void,
) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onUseDevice() {
    if (!navigator.geolocation) {
      setError("Location isn’t available in this browser.");
      return;
    }
    setError(null);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rLat = Math.round(pos.coords.latitude * 100) / 100;
        const rLng = Math.round(pos.coords.longitude * 100) / 100;
        startTransition(async () => {
          const res = await onSave(rLat, rLng);
          if (res.ok) {
            setMessage("Saved.");
            onSuccess?.();
            return;
          }
          setError(res.error ?? "Could not save.");
        });
      },
      () => setError("We couldn’t read your location. Check browser permissions."),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 15_000 },
    );
  }

  return { message, error, pending, onUseDevice };
}

function LocationBlock({
  title,
  description,
  currentLabel,
  icon,
  buttonLabel,
  onSave,
  onSuccess,
}: {
  title: string;
  description: string;
  currentLabel: string | null;
  icon: "home" | "browse";
  buttonLabel: string;
  onSave: (lat: number, lng: number) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const { message, error, pending, onUseDevice } = useDeviceLocation(
    onSave,
    onSuccess,
  );
  const Icon = icon === "home" ? Home : Navigation;

  return (
    <div className="rounded-xl border border-base-300/80 bg-base-100 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${icon === "home" ? "text-success" : "text-primary"}`}
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="shelfswap-heading text-sm font-semibold">{title}</h2>
          <p className="text-xs text-base-content/60 leading-snug mt-1">{description}</p>
          {currentLabel ? (
            <p className="text-xs text-base-content/80 mt-2">
              Current: <span className="font-medium">{currentLabel}</span>
            </p>
          ) : (
            <p className="text-xs text-base-content/50 mt-2">Not set yet.</p>
          )}
        </div>
      </div>
      <button
        type="button"
        className={`btn btn-outline btn-sm gap-2 w-full ${
          icon === "home" ? "btn-success border-success/30" : "btn-primary border-primary/30"
        }`}
        disabled={pending}
        onClick={() => onUseDevice()}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {buttonLabel}
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
  );
}

export function ProfileLocationSettings({ homeAreaLabel, browseAreaLabel }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary">
        <MapPin className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide">Location</span>
      </div>
      <LocationBlock
        title="Where your books are"
        description="Fixed area shown on your listings. Stays the same when you travel."
        currentLabel={homeAreaLabel}
        icon="home"
        buttonLabel="Set home from this device"
        onSave={async (lat, lng) => {
          const res = await setMyHomeLocationAction(lat, lng);
          return res.ok ? { ok: true } : { ok: false, error: res.error };
        }}
        onSuccess={() => router.refresh()}
      />
      <LocationBlock
        title="Where you’re browsing"
        description="Used for Home, Browse, and Search — updates when you move around."
        currentLabel={browseAreaLabel}
        icon="browse"
        buttonLabel="Update browse location"
        onSave={async (lat, lng) => {
          const res = await setMyBrowseLocationAction(lat, lng);
          return res.ok ? { ok: true } : { ok: false, error: res.error };
        }}
        onSuccess={() => router.refresh()}
      />
      <p className="text-[11px] text-base-content/50 leading-snug">
        We store only a rough area (about 1 km), never your full address.
      </p>
    </div>
  );
}
