/**
 * Reverse-geocode lat/lng into a human-friendly area label (town/area).
 * Uses OpenStreetMap Nominatim (no key). Best-effort + cached.
 * Location: lib/geo/reverseGeocode.ts
 */

type NominatimRes = {
  address?: Record<string, string | undefined>;
  name?: string;
  display_name?: string;
};

function pick(parts: Array<string | null | undefined>): string[] {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean);
}

function uniq(arr: string[]): string[] {
  const out: string[] = [];
  for (const s of arr) if (!out.includes(s)) out.push(s);
  return out;
}

export async function reverseGeocodeAreaText(
  lat: number,
  lng: number,
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Zoom ~12: neighbourhood/town level; avoids precise addresses.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat),
  )}&lon=${encodeURIComponent(String(lng))}&zoom=12&addressdetails=1`;

  const res = await fetch(url, {
    next: { revalidate: 86_400 },
    headers: {
      Accept: "application/json",
      // Nominatim requires a UA; keep it generic.
      "User-Agent": "ShelfSwap (reverse geocode)",
    },
  });

  if (!res.ok) return null;
  const json = (await res.json()) as NominatimRes;
  const a = json.address ?? {};

  const local = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city;
  const bigger = a.city || a.town || a.county || a.state;

  const parts = uniq(pick([local, bigger]));
  if (parts.length === 0) return null;

  const text = parts.join(", ").slice(0, 80);
  if (text.length < 2) return null;
  return text;
}

