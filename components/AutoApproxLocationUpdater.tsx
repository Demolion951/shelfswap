"use client";

/**
 * Rough-location updater for the authenticated app shell.
 * If geolocation is already allowed, refreshes approx coordinates on app load and when the tab/app
 * becomes visible again (throttled). Browsers still require a prior grant — first-time users see
 * an opt-in banner so we can trigger the permission prompt from a tap (“Enable”).
 * Location: components/AutoApproxLocationUpdater.tsx
 */
import { setMyApproxLocationAction } from "@/app/app/profile/location-actions";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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

/** Minimum time between automatic server syncs (Strict Mode + rapid visibility events). */
const AUTO_SYNC_THROTTLE_MS = 45_000;

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
  const syncInFlight = useRef(false);
  /** Avoid SSR vs client mismatch: navigator / geolocation only exist in the browser. */
  const [mounted, setMounted] = useState(false);

  /** Used only for the opt-in banner: don’t re-prompt constantly after a recent sync attempt. */
  const shouldOfferBannerByCooldown = useMemo(() => {
    const last = readNumber(LS_LAST_SYNC) ?? 0;
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

  /** While permission is granted, sync on load and when returning to the app (throttled). */
  useEffect(() => {
    if (perm !== "granted") return;

    function shouldThrottle(): boolean {
      const last = readNumber(LS_LAST_SYNC) ?? 0;
      return nowMs() - last < AUTO_SYNC_THROTTLE_MS;
    }

    function runSilentSync() {
      if (syncInFlight.current || shouldThrottle()) return;
      syncInFlight.current = true;
      startTransition(async () => {
        try {
          if (shouldThrottle()) return;
          const coords = await getCoarseCoords();
          if (!coords) return;
          const res = await setMyApproxLocationAction(coords.lat, coords.lng);
          if (!res.ok) return;
          writeNumber(LS_LAST_SYNC, nowMs());
          writeNumber(LS_LAST_LAT, coords.lat);
          writeNumber(LS_LAST_LNG, coords.lng);
        } finally {
          syncInFlight.current = false;
        }
      });
    }

    runSilentSync();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      runSilentSync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [perm]);

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
    shouldOfferBannerByCooldown &&
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

