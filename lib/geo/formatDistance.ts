/**
 * Human-readable approximate distance for UI (never exposes raw coordinates).
 * Location: lib/geo/formatDistance.ts
 */
export function formatApproxDistanceKm(km: number | null | undefined): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 0.05) return "Very close (approx.)";
  if (km < 1) return `~${Math.max(0.1, Math.round(km * 10) / 10)} km away (approx.)`;
  if (km < 10) return `~${Math.round(km * 10) / 10} km away (approx.)`;
  if (km < 100) return `~${Math.round(km)} km away (approx.)`;
  return `~${Math.round(km / 5) * 5} km away (approx.)`;
}

/**
 * Card / list line: always mentions approximate distance policy (never “hidden”—may be pending).
 */
export function approxDistanceAlwaysVisibleLine(km: number | null | undefined): string {
  const formatted = formatApproxDistanceKm(km);
  if (formatted) return formatted;
  return "~km once you & seller save a rough area—not an exact address.";
}
