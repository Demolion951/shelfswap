/**
 * Header / landing logo URL. Bump `LOGO_VERSION` whenever `public/brand/logo.png` is replaced
 * so browsers and intermediaries do not keep showing an older cached image.
 * Location: lib/brand/logo.ts
 */
export const LOGO_VERSION = "20260531-trimmed-sm";

export function shelfswapLogoSrc(): string {
  return `/brand/logo.png?v=${LOGO_VERSION}`;
}
