/**
 * Public support contact for ShelfSwap (mailto, Contact page, footers).
 * Override with NEXT_PUBLIC_SUPPORT_EMAIL in Vercel if the address changes.
 * Location: lib/site/support.ts
 */
const FALLBACK = "support@shelfswap.net";

export function supportEmail(): string {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v && v.includes("@") ? v.toLowerCase() : FALLBACK;
}

export function supportMailtoHref(): string {
  return `mailto:${supportEmail()}`;
}

/** Pre-filled mailto for reporting a problem on an active deal. */
export function supportDealReportHref(listingId: string, listingTitle: string): string {
  const subject = encodeURIComponent(`ShelfSwap deal issue — ${listingTitle}`);
  const body = encodeURIComponent(
    `Listing ID: ${listingId}\nBook: ${listingTitle}\n\nDescribe what happened:\n`,
  );
  return `mailto:${supportEmail()}?subject=${subject}&body=${body}`;
}
