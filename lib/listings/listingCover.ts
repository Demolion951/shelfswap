/**
 * Cover priority: official catalogue art first, seller photos as extras / fallback.
 * Location: lib/listings/listingCover.ts
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";

export function sortedListingPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

/** Same-origin cover API with full OL → Google fallback chain. */
export function catalogueCoverApiPath(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "M",
): string | null {
  const digits = listing.isbn?.replace(/\D/g, "") ?? "";
  if (digits.length !== 10 && digits.length !== 13) return null;
  const q = new URLSearchParams({ isbn: digits, size });
  if (listing.title?.trim()) q.set("title", listing.title.trim());
  if (listing.author?.trim()) q.set("author", listing.author.trim());
  return `/api/book-cover?${q.toString()}`;
}

/** Official / catalogue cover (stored URL or ISBN API). */
export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "L",
): string | null {
  const fromApi = catalogueCoverApiPath(listing, size);
  if (fromApi) return fromApi;
  if (listing.cover_url?.trim()) {
    return coverImageSrcForDisplay(listing.cover_url) ?? listing.cover_url;
  }
  return null;
}

/** Thumbnail + card hero: catalogue first, then first seller photo. */
export function primaryListingCoverRaw(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "M",
): string | null {
  const catalogue = catalogueListingCoverSrc(listing, size);
  if (catalogue) return catalogue;
  const photos = sortedListingPhotos(listing);
  if (photos[0]?.url?.trim()) return photos[0].url.trim();
  return null;
}

/** Display-ready src (proxies Open Library URLs). */
export function primaryListingCoverSrc(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "M",
): string | null {
  const raw = primaryListingCoverRaw(listing, size);
  if (!raw) return null;
  return coverImageSrcForDisplay(raw) ?? raw;
}

/** Fallback after a failed image load (skip the src that failed). */
export function listingCoverFallbackSrc(
  listing: ListingWithRelations,
  failedSrc: string,
  size: "S" | "M" | "L" = "M",
): string | null {
  const candidates: string[] = [];
  const catalogue = catalogueListingCoverSrc(listing, size);
  if (catalogue) candidates.push(catalogue);
  if (listing.cover_url?.trim()) candidates.push(listing.cover_url.trim());
  for (const ph of sortedListingPhotos(listing)) {
    if (ph.url?.trim()) candidates.push(ph.url.trim());
  }

  const norm = (s: string) => coverImageSrcForDisplay(s) ?? s;
  const failed = norm(failedSrc);
  for (const c of candidates) {
    const display = norm(c);
    if (display !== failed) return display;
  }
  return null;
}
