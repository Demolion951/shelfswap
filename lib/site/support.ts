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
