/**
 * Cover priority: official catalogue art first when reliable; seller photos first otherwise.
 * Card feeds use direct CDN URLs (no proxy rewrite) for faster first paint.
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

function isProxyCoverUrl(url: string): boolean {
  return url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover");
}

function isOpenLibraryUrl(url: string): boolean {
  return /covers\.openlibrary\.org/i.test(url);
}

/** Card img src: keep Supabase/Google direct; OL CDN stays direct (no proxy hop). */
function coverSrcForCard(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (isOpenLibraryUrl(trimmed)) {
    try {
      const href = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
      return new URL(href).href;
    } catch {
      return trimmed;
    }
  }
  return coverImageSrcForDisplay(trimmed) ?? trimmed;
}

/**
 * True when we have a stored cover that is not a generic OL ISBN placeholder.
 * OL ISBN URLs often 404 or return tiny placeholders — unreliable when seller photos exist.
 */
export function hasReliableCatalogueCover(listing: ListingWithRelations): boolean {
  const stored = listing.cover_url?.trim();
  if (!stored || isProxyCoverUrl(stored)) return false;
  if (isOpenLibraryUrl(stored)) return false;
  const digits = isbnDigits(listing);
  if (digits && stored.includes(digits) && isOpenLibraryUrl(stored)) return false;
  return true;
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

/** Official / catalogue cover (stored URL, direct CDN, or ISBN API). */
export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "L",
): string | null {
  const stored = listing.cover_url?.trim();
  if (stored && !isProxyCoverUrl(stored)) {
    return coverSrcForCard(stored) ?? stored;
  }
  const direct = directCatalogueCoverUrl(listing, size);
  if (direct) return direct;
  if (stored) return coverSrcForCard(stored) ?? stored;
  return catalogueCoverApiPath(listing, size);
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

function buildCandidateList(
  listing: ListingWithRelations,
  size: CoverSize,
  sellerFirst: boolean,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null | undefined) => {
    if (!raw?.trim()) return;
    const display = coverSrcForCard(raw.trim()) ?? raw.trim();
    const key = normalizeCoverKey(display);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(display);
  };

  const sellerPhoto = firstSellerPhotoSrc(listing);
  const unreliableCatalogue = !hasReliableCatalogueCover(listing);

  if (sellerFirst && sellerPhoto) {
    add(sellerPhoto);
    return out;
  }

  if (unreliableCatalogue && sellerPhoto) {
    add(sellerPhoto);
    if (hasReliableCatalogueCover(listing)) {
      add(catalogueListingCoverSrc(listing, size));
    }
    return out;
  }

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

/** Full chain for detail pages (catalogue first when reliable). */
export function listingCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string[] {
  return buildCandidateList(listing, size, false);
}

/** Optimized chain for feed cards — seller photo only when catalogue is unreliable. */
export function listingCoverCandidatesForCard(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string[] {
  const sellerPhoto = firstSellerPhotoSrc(listing);
  if (sellerPhoto && !hasReliableCatalogueCover(listing)) {
    return buildCandidateList(listing, size, true);
  }
  return buildCandidateList(listing, size, false);
}

/** First seller-uploaded photo URL, if any. */
export function firstSellerPhotoSrc(listing: ListingWithRelations): string | null {
  const ph = sortedListingPhotos(listing)[0];
  if (!ph?.url?.trim()) return null;
  return coverSrcForCard(ph.url.trim()) ?? ph.url.trim();
}

/** Thumbnail + card hero: first candidate (card-optimized). */
export function primaryListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  return listingCoverCandidatesForCard(listing, size)[0] ?? firstSellerPhotoSrc(listing);
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
