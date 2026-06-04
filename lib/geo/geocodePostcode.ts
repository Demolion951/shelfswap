/**
 * UK postcode → coarse lat/lng for home area (not shown publicly on listings).
 * Location: lib/geo/geocodePostcode.ts
 */
import { reverseGeocodeAreaText } from "@/lib/geo/reverseGeocode";

export type PostcodeGeocodeResult =
  | { ok: true; lat: number; lng: number; areaLabel: string | null }
  | { ok: false; error: string };

/** Normalise UK postcode for lookup (e.g. "tw9 2aa" → "TW9 2AA"). */
export function normalizeUkPostcode(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return "";
  const compact = s.replace(/\s/g, "");
  if (compact.length <= 3) return s;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`.trim();
}

export async function geocodeUkPostcode(postcode: string): Promise<PostcodeGeocodeResult> {
  const normalized = normalizeUkPostcode(postcode);
  if (normalized.length < 5) {
    return { ok: false, error: "Enter a valid UK postcode." };
  }

  const encoded = encodeURIComponent(normalized.replace(/\s/g, ""));
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, {
      next: { revalidate: 86_400 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        status?: number;
        result?: { latitude?: number; longitude?: number };
      };
      const lat = json.result?.latitude;
      const lng = json.result?.longitude;
      if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
        const rLat = Math.round(lat * 100) / 100;
        const rLng = Math.round(lng * 100) / 100;
        const areaLabel = await reverseGeocodeAreaText(rLat, rLng);
        return { ok: true, lat: rLat, lng: rLng, areaLabel };
      }
    }
  } catch (e) {
    console.warn("[geocodeUkPostcode] postcodes.io", e);
  }

  return { ok: false, error: "Could not find that postcode. Check it and try again." };
}
