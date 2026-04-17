"use client";

/**
 * Passive rough-location updater for the authenticated app shell.
 * If location permission is already granted, refresh the saved rough area in the background.
 * If permission isn't granted, show a small opt-in banner (no repeated nagging).
 * Location: components/AutoApproxLocationUpdater.tsx
 */
import { setMyApproxLocationAction } from "@/app/app/profile/location-actions";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type PermissionStateLike = "granted" | "prompt" | "denied";

const LS_LAST_SYNC = "ss_last_loc_sync_ms";
const LS_DISMISSED = "ss_loc_banner_dismissed";
const LS_LAST_LAT = "ss_last_loc_lat";
const LS_LAST_LNG = "ss_last_loc_lng";

function nowMs() {
  return Date.now();
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
}

async function getGeoPermissionState(): Promise<PermissionStateLike | null> {
  if (typeof navigator === "undefined") return null;
  const perms = navigator.permissions;
  if (!perms?.query) return null;
  try {
    const res = await perms.query({ name: "geolocation" as PermissionName });
    const state = res?.state;
    if (state === "granted" || state === "prompt" || state === "denied") return state;
    return null;
  } catch {
    return null;
  }
}

function getCoarseCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rLat = Math.round(pos.coords.latitude * 100) / 100;
        const rLng = Math.round(pos.coords.longitude * 100) / 100;
        resolve({ lat: rLat, lng: rLng });
      },
      () => resolve(null),
      // Prefer a fresh-ish reading so we don't get stuck on yesterday's cached position.
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  });
}

export function AutoApproxLocationUpdater() {
  const [perm, setPerm] = useState<PermissionStateLike | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  /** Avoid SSR vs client mismatch: navigator / geolocation only exist in the browser. */
  const [mounted, setMounted] = useState(false);

  const shouldAttemptAutoSync = useMemo(() => {
    const last = readNumber(LS_LAST_SYNC) ?? 0;
    // If permission is already granted, a coarse refresh is silent.
    // Keep it fairly fresh so returning users don't get stuck on an old area.
    return nowMs() - last > 6 * 60 * 60 * 1000; // 6 hours
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMounted(true);
      setDismissed(readBool(LS_DISMISSED));
    }, 0);
    void getGeoPermissionState().then((s) => setPerm(s));
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!shouldAttemptAutoSync) return;
    if (perm !== "granted") return;
    // Silent refresh if permission is already granted.
    startTransition(async () => {
      const coords = await getCoarseCoords();
      if (!coords) return;
      const lastLat = readNumber(LS_LAST_LAT);
      const lastLng = readNumber(LS_LAST_LNG);
      const moved =
        lastLat == null ||
        lastLng == null ||
        Math.abs(coords.lat - lastLat) >= 0.02 ||
        Math.abs(coords.lng - lastLng) >= 0.02;
      if (!moved && !shouldAttemptAutoSync) return;
      const res = await setMyApproxLocationAction(coords.lat, coords.lng);
      if (!res.ok) return;
      writeNumber(LS_LAST_SYNC, nowMs());
      writeNumber(LS_LAST_LAT, coords.lat);
      writeNumber(LS_LAST_LNG, coords.lng);
    });
  }, [perm, shouldAttemptAutoSync]);

  function onEnable() {
    setError(null);
    startTransition(async () => {
      const coords = await getCoarseCoords(); // triggers prompt if needed
      if (!coords) {
        setError("Couldn’t read your location. Check browser permissions.");
        return;
      }
      const res = await setMyApproxLocationAction(coords.lat, coords.lng);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      writeNumber(LS_LAST_SYNC, nowMs());
      writeNumber(LS_LAST_LAT, coords.lat);
      writeNumber(LS_LAST_LNG, coords.lng);
      setPerm("granted");
      setDismissed(true);
      writeBool(LS_DISMISSED, true);
    });
  }

  function onDismiss() {
    setDismissed(true);
    writeBool(LS_DISMISSED, true);
  }

  const showBanner =
    mounted &&
    !dismissed &&
    shouldAttemptAutoSync &&
    (perm === "prompt" || perm === null) &&
    typeof navigator !== "undefined" &&
    !!navigator.geolocation;

  if (!showBanner) return null;

  return (
    <div className="alert bg-base-100 border border-base-300/80 text-sm">
      <MapPin className="h-4 w-4 text-primary" aria-hidden />
      <div className="min-w-0">
        <div className="font-medium">Turn on rough location?</div>
        <div className="text-xs text-base-content/60 leading-snug">
          Helps show approximate distances. No address is stored.
        </div>
        {error ? (
          <div className="mt-2 text-xs text-error">{error}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onEnable()}
          disabled={pending}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Enable
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDismiss()}>
          Not now
        </button>
      </div>
    </div>
  );
}

