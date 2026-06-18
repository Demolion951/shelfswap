/**
 * Returns true when the URL loads as a usable cover (not a blank OL placeholder).
 * Location: lib/client/probeImageUrl.ts
 */

const MIN_COVER_PX = 20;

export function isUsefulCoverDimensions(width: number, height: number): boolean {
  return width >= MIN_COVER_PX && height >= MIN_COVER_PX;
}

export function probeImageUrl(url: string, timeoutMs = 4500): Promise<boolean> {
  if (typeof window === "undefined" || !url.trim()) return Promise.resolve(false);

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.decoding = "async";
    img.onload = () => {
      finish(isUsefulCoverDimensions(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => finish(false);
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}
