/**
 * Sanitize listing metadata before embedding in cover API query strings.
 * Location: lib/listings/listingCover.ts
 */
import { type CoverSize } from "@/lib/books/catalogueCoverResolve";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";

/** Primary size for catalogue covers — home + detail must match. */
export const CARD_CATALOGUE_SIZE: CoverSize = "M";

export function sortedListingPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

function cleanMetadataText(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.replace(/\s+/g, " ").trim();
}

function isbnDigits(listing: ListingWithRelations): string | null {
  const digits = listing.isbn?.replace(/\D/g, "") ?? "";
  if (digits.length !== 10 && digits.length !== 13) return null;
  return digits;
}

function isProxyCoverUrl(url: string): boolean {
  return url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover");
}

function isOpenLibraryUrl(url: string): boolean {
  return /covers\.openlibrary\.org/i.test(url);
}

/** Any seller-uploaded photo URL (public or signed Supabase paths). */
export function isSellerStorageUrl(url: string): boolean {
  return /listing-photos/i.test(url);
}

function coverSrcForCard(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return coverImageSrcForDisplay(raw.trim()) ?? raw.trim();
}

export function hasReliableCatalogueCover(listing: ListingWithRelations): boolean {
  const stored = listing.cover_url?.trim();
  if (!stored || isProxyCoverUrl(stored)) return false;
  if (isOpenLibraryUrl(stored)) return false;
  if (/google|gstatic|books\.google/i.test(stored)) return false;
  if (isSellerStorageUrl(stored)) return false;
  if (stored.includes("/storage/v1/object/public/")) return true;
  if (/^https?:\/\//i.test(stored)) return true;
  return false;
}

/** OL cover_id from cover_url saved at list time (edition-accurate). */
function openLibraryCoverIdApiFromStored(raw: string, size: CoverSize): string | null {
  const trimmed = raw.trim();
  const m = trimmed.match(/covers\.openlibrary\.org\/b\/id\/(\d+)/i);
  if (!m) return null;
  return `/api/openlibrary-cover?id=${encodeURIComponent(m[1])}&size=${size}`;
}

/**
 * /api/book-cover with ISBN + listing metadata (fallback when stored cover_id missing).
 */
export function catalogueCoverApiPath(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string | null {
  const digits = isbnDigits(listing);
  if (!digits) return null;
  const q = new URLSearchParams({ isbn: digits, size });
  const title = cleanMetadataText(listing.title);
  const author = cleanMetadataText(listing.author);
  if (title) q.set("title", title);
  if (author) q.set("author", author);
  return `/api/book-cover?${q.toString()}`;
}

function normalizeCoverKey(url: string): string {
  const display = coverSrcForCard(url) ?? url;
  try {
    const u = new URL(display, "https://shelfswap.net");
    return `${u.pathname}${u.search}`;
  } catch {
    return display;
  }
}

/**
 * Catalogue URLs for home + detail (same order).
 * 1. cover_id from cover_url at list time — correct edition art
 * 2. /api/book-cover ISBN resolve with metadata
 */
export function listingCatalogueCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null | undefined) => {
    if (!raw?.trim()) return;
    const display = raw.trim();
    if (isSellerStorageUrl(display)) return;
    if (!isProxyCoverUrl(display)) return;
    const key = normalizeCoverKey(display);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(display);
  };

  const digits = isbnDigits(listing);
  if (!digits) return out;

  const stored = listing.cover_url?.trim();
  if (stored) {
    add(openLibraryCoverIdApiFromStored(stored, size));
    for (const altSize of ["M", "L", "S"] as const) {
      if (altSize !== size) add(openLibraryCoverIdApiFromStored(stored, altSize));
    }
  }

  add(catalogueCoverApiPath(listing, size));
  for (const altSize of ["M", "L", "S"] as const) {
    if (altSize !== size) add(catalogueCoverApiPath(listing, altSize));
  }

  return out;
}

/** Card cover chain: catalogue API first, seller photos as fallback. */
export function listingCoverCandidatesForCard(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string[] {
  const out = [...listingCatalogueCoverCandidates(listing, size)];
  const seen = new Set(out.map(normalizeCoverKey));

  for (const ph of sortedListingPhotos(listing)) {
    const src = coverSrcForCard(ph.url?.trim());
    if (!src) continue;
    const key = normalizeCoverKey(src);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(src);
  }

  return out;
}

export function listingCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string[] {
  return listingCoverCandidatesForCard(listing, size);
}

export function firstSellerPhotoSrc(listing: ListingWithRelations): string | null {
  const ph = sortedListingPhotos(listing)[0];
  if (!ph?.url?.trim()) return null;
  return coverSrcForCard(ph.url.trim()) ?? ph.url.trim();
}

export function primaryListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string | null {
  return listingCoverCandidatesForCard(listing, size)[0] ?? firstSellerPhotoSrc(listing);
}

export function listingCoverFallbackSrc(
  listing: ListingWithRelations,
  failedSrc: string,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string | null {
  const failedKey = normalizeCoverKey(failedSrc);
  for (const c of listingCoverCandidates(listing, size)) {
    if (normalizeCoverKey(c) !== failedKey) return c;
  }
  return null;
}

export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string | null {
  return listingCatalogueCoverCandidates(listing, size)[0] ?? null;
}

export function directCatalogueCoverUrl(
  listing: ListingWithRelations,
  size: CoverSize = CARD_CATALOGUE_SIZE,
): string | null {
  return catalogueCoverApiPath(listing, size);
}

export function isCatalogueCoverApiUrl(url: string): boolean {
  return url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover");
}

/** Shared detail-page cover frame (consistent sizing). */
export const DETAIL_COVER_IMG_CLASS =
  "h-72 w-48 max-h-[min(80vw,20rem)] max-w-[min(85vw,12rem)] object-contain rounded-lg shadow-md";

export const DETAIL_COVER_PLACEHOLDER_CLASS =
  "flex h-72 w-48 max-w-[min(85vw,12rem)] items-center justify-center rounded-lg bg-base-300/30";
