/**
 * Cover image priority: seller photos beat Open Library (OL often has no image for an ISBN).
 * Location: lib/listings/listingCover.ts
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";

export function sortedListingPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

function isbnCoverPath(isbn: string | null | undefined, size: "S" | "M" | "L"): string | null {
  const digits = isbn?.replace(/\D/g, "") ?? "";
  if (digits.length !== 10 && digits.length !== 13) return null;
  return `/api/book-cover?isbn=${encodeURIComponent(digits)}&size=${size}`;
}

/** Raw URL/path for the best thumbnail (seller photo first). */
export function primaryListingCoverRaw(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "M",
): string | null {
  const photos = sortedListingPhotos(listing);
  if (photos[0]?.url?.trim()) return photos[0].url.trim();
  if (listing.cover_url?.trim()) {
    return coverImageSrcForDisplay(listing.cover_url) ?? listing.cover_url;
  }
  return isbnCoverPath(listing.isbn, size);
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

/** Open Library / stored catalogue cover only (for optional extra carousel slide). */
export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "L",
): string | null {
  if (listing.cover_url?.trim()) {
    return coverImageSrcForDisplay(listing.cover_url) ?? listing.cover_url;
  }
  return isbnCoverPath(listing.isbn, size);
}

/** Fallback chain after a failed image load (skip the src that failed). */
export function listingCoverFallbackSrc(
  listing: ListingWithRelations,
  failedSrc: string,
  size: "S" | "M" | "L" = "M",
): string | null {
  const photos = sortedListingPhotos(listing);
  const candidates: string[] = [];
  for (const ph of photos) {
    if (ph.url?.trim()) candidates.push(ph.url.trim());
  }
  if (listing.cover_url?.trim()) candidates.push(listing.cover_url.trim());
  let isbnPath = isbnCoverPath(listing.isbn, size);
  if (isbnPath && listing.title?.trim()) {
    const q = new URLSearchParams({ isbn: listing.isbn!.replace(/\D/g, ""), size });
    q.set("title", listing.title.trim());
    if (listing.author?.trim()) q.set("author", listing.author.trim());
    isbnPath = `/api/book-cover?${q.toString()}`;
  }
  if (isbnPath) candidates.push(isbnPath);

  const norm = (s: string) => coverImageSrcForDisplay(s) ?? s;
  const failed = norm(failedSrc);
  for (const c of candidates) {
    const display = norm(c);
    if (display !== failed) return display;
  }
  return null;
}
