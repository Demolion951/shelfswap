/**
 * Returns true when the URL loads as an image (for cover candidate probing).
 * Location: lib/client/probeImageUrl.ts
 */

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
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}
