/**
 * Canonical site URL for Stripe redirect URLs (set NEXT_PUBLIC_SITE_URL on Vercel).
 * Location: lib/stripe/appUrl.ts
 */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
