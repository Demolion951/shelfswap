/**
 * Listing location line for cards and detail (town/area only, no distance).
 * Location: lib/listings/areaDisplay.ts
 */
export function listingAreaLine(approxAreaText: string | null | undefined): string | null {
  const town = approxAreaText?.trim();
  return town && town.length > 0 ? town : null;
}
