/**
 * Cover priority: official catalogue art first, seller photos as extras / fallback.
 * Prefers direct CDN URLs over same-origin proxy for faster first paint.
 * Location: lib/listings/listingCover.ts
 */
import { openLibraryIsbnImageUrl, type CoverSize } from "@/lib/books/catalogueCoverResolve";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";

export function sortedListingPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

function isbnDigits(listing: ListingWithRelations): string | null {
  const digits = listing.isbn?.replace(/\D/g, "") ?? "";
  if (digits.length !== 10 && digits.length !== 13) return null;
  return digits;
}

/** Direct Open Library CDN (fast browser load; no app server round-trip). */
export function directCatalogueCoverUrl(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  const digits = isbnDigits(listing);
  if (!digits) return null;
  return openLibraryIsbnImageUrl(digits, size);
}

/** Same-origin cover API — last resort when CDN URLs 404. */
export function catalogueCoverApiPath(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  const digits = isbnDigits(listing);
  if (!digits) return null;
  const q = new URLSearchParams({ isbn: digits, size });
  if (listing.title?.trim()) q.set("title", listing.title.trim());
  if (listing.author?.trim()) q.set("author", listing.author.trim());
  return `/api/book-cover?${q.toString()}`;
}

function isProxyCoverUrl(url: string): boolean {
  return url.includes("/api/book-cover");
}

/** Official / catalogue cover (stored URL, direct CDN, or ISBN API). */
export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "L",
): string | null {
  const stored = listing.cover_url?.trim();
  if (stored && !isProxyCoverUrl(stored)) {
    return coverImageSrcForDisplay(stored) ?? stored;
  }
  const direct = directCatalogueCoverUrl(listing, size);
  if (direct) return direct;
  if (stored) return coverImageSrcForDisplay(stored) ?? stored;
  return catalogueCoverApiPath(listing, size);
}

function normalizeCoverKey(url: string): string {
  const display = coverImageSrcForDisplay(url) ?? url;
  try {
    const u = new URL(display, "https://shelfswap.net");
    return `${u.pathname}${u.search}`;
  } catch {
    return display;
  }
}

/** Ordered unique sources: catalogue CDN → stored URL → seller photos → proxy API. */
export function listingCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null | undefined) => {
    if (!raw?.trim()) return;
    const display = coverImageSrcForDisplay(raw.trim()) ?? raw.trim();
    const key = normalizeCoverKey(display);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(display);
  };

  add(catalogueListingCoverSrc(listing, size));
  add(directCatalogueCoverUrl(listing, size));
  if (listing.cover_url?.trim() && !isProxyCoverUrl(listing.cover_url)) {
    add(listing.cover_url);
  }
  for (const ph of sortedListingPhotos(listing)) {
    add(ph.url);
  }
  add(catalogueCoverApiPath(listing, size));

  return out;
}

/** First seller-uploaded photo URL, if any. */
export function firstSellerPhotoSrc(listing: ListingWithRelations): string | null {
  const ph = sortedListingPhotos(listing)[0];
  if (!ph?.url?.trim()) return null;
  return coverImageSrcForDisplay(ph.url.trim()) ?? ph.url.trim();
}

/** Thumbnail + card hero: first candidate. */
export function primaryListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  return listingCoverCandidates(listing, size)[0] ?? firstSellerPhotoSrc(listing);
}

/** @deprecated Use listingCoverCandidates — kept for one-step fallback callers. */
export function listingCoverFallbackSrc(
  listing: ListingWithRelations,
  failedSrc: string,
  size: CoverSize = "M",
): string | null {
  const failedKey = normalizeCoverKey(failedSrc);
  for (const c of listingCoverCandidates(listing, size)) {
    if (normalizeCoverKey(c) !== failedKey) return c;
  }
  return null;
}
