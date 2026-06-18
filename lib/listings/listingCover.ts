/**
 * Cover priority: official ISBN / catalogue art first; seller photos only as fallback.
 * Cards use /api/book-cover for ISBN (rejects blank OL placeholders); seller photos next.
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

/** Normalise cover URLs for display (OL ISBN → /api/book-cover, Supabase unchanged). */
function coverSrcForCard(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return coverImageSrcForDisplay(raw.trim()) ?? raw.trim();
}

/**
 * True when we have a stored non–Open Library cover (e.g. Google Books thumbnail).
 */
export function hasReliableCatalogueCover(listing: ListingWithRelations): boolean {
  const stored = listing.cover_url?.trim();
  if (!stored || isProxyCoverUrl(stored)) return false;
  if (isOpenLibraryUrl(stored)) return false;
  const digits = isbnDigits(listing);
  if (digits && stored.includes(digits) && isOpenLibraryUrl(stored)) return false;
  return true;
}

/** Direct Open Library CDN (detail carousel fallback only). */
export function directCatalogueCoverUrl(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  const digits = isbnDigits(listing);
  if (!digits) return null;
  return openLibraryIsbnImageUrl(digits, size);
}

/** Same-origin cover API — resolves OL + Google; 404 when no real cover. */
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

/** Official / catalogue cover for detail pages. */
export function catalogueListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "L",
): string | null {
  const stored = listing.cover_url?.trim();
  if (stored && !isProxyCoverUrl(stored)) {
    return coverSrcForCard(stored) ?? stored;
  }
  const api = catalogueCoverApiPath(listing, size);
  if (api) return api;
  const direct = directCatalogueCoverUrl(listing, size);
  if (direct) return direct;
  if (stored) return coverSrcForCard(stored) ?? stored;
  return null;
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

type BuildCandidateOptions = {
  /** When false, only official / stored catalogue art (detail page hero). */
  includeSellerPhotos?: boolean;
};

/**
 * Catalogue first, seller photos second (cards only).
 * ISBN listings use /api/book-cover before seller photos so a missing catalogue
 * returns 404 and falls through to the seller's photo.
 */
function buildCandidateList(
  listing: ListingWithRelations,
  size: CoverSize,
  options: BuildCandidateOptions = {},
): string[] {
  const includeSellerPhotos = options.includeSellerPhotos !== false;
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

  const stored = listing.cover_url?.trim();
  const digits = isbnDigits(listing);

  if (stored && hasReliableCatalogueCover(listing)) {
    add(stored);
  }

  if (digits) {
    add(catalogueCoverApiPath(listing, size));
  }

  if (includeSellerPhotos) {
    for (const ph of sortedListingPhotos(listing)) {
      add(ph.url);
    }
  }

  if (stored && !isProxyCoverUrl(stored) && !hasReliableCatalogueCover(listing)) {
    add(stored);
  }

  return out;
}

/** Official catalogue cover candidates only — never seller-uploaded photos. */
export function listingCatalogueCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = "L",
): string[] {
  return buildCandidateList(listing, size, { includeSellerPhotos: false });
}

export function listingCoverCandidates(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string[] {
  return buildCandidateList(listing, size);
}

export function listingCoverCandidatesForCard(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string[] {
  return listingCoverCandidates(listing, size);
}

export function firstSellerPhotoSrc(listing: ListingWithRelations): string | null {
  const ph = sortedListingPhotos(listing)[0];
  if (!ph?.url?.trim()) return null;
  return coverSrcForCard(ph.url.trim()) ?? ph.url.trim();
}

export function primaryListingCoverSrc(
  listing: ListingWithRelations,
  size: CoverSize = "M",
): string | null {
  return listingCoverCandidatesForCard(listing, size)[0] ?? firstSellerPhotoSrc(listing);
}

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
