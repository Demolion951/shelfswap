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
  if (listing.cover_url?.trim()) {
    return coverImageSrcForDisplay(listing.cover_url) ?? listing.cover_url;
  }
  const fromApi = catalogueCoverApiPath(listing, size);
  if (fromApi) return fromApi;
  return null;
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

/** Ordered unique sources: catalogue → stored URL → seller photos. */
export function listingCoverCandidates(
  listing: ListingWithRelations,
  size: "S" | "M" | "L" = "M",
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
  add(listing.cover_url);
  for (const ph of sortedListingPhotos(listing)) {
    add(ph.url);
  }

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
  size: "S" | "M" | "L" = "M",
): string | null {
  return listingCoverCandidates(listing, size)[0] ?? firstSellerPhotoSrc(listing);
}

/** @deprecated Use listingCoverCandidates — kept for one-step fallback callers. */
export function listingCoverFallbackSrc(
  listing: ListingWithRelations,
  failedSrc: string,
  size: "S" | "M" | "L" = "M",
): string | null {
  const failedKey = normalizeCoverKey(failedSrc);
  for (const c of listingCoverCandidates(listing, size)) {
    if (normalizeCoverKey(c) !== failedKey) return c;
  }
  return null;
}
