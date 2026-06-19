/**
 * Returns true when the URL loads as a usable cover (not a blank OL placeholder).
 * Location: lib/client/probeImageUrl.ts
 */

const MIN_COVER_PX = 20;
const MIN_API_COVER_BYTES = 500;

export function isUsefulCoverDimensions(width: number, height: number): boolean {
  return width >= MIN_COVER_PX && height >= MIN_COVER_PX;
}

function isSameOriginCoverApi(url: string): boolean {
  return url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover");
}

async function probeSameOriginCoverApi(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("image")) return false;
    const bytes = await res.arrayBuffer();
    return bytes.byteLength >= MIN_API_COVER_BYTES;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export function probeImageUrl(url: string, timeoutMs = 2800): Promise<boolean> {
  if (typeof window === "undefined" || !url.trim()) return Promise.resolve(false);

  if (isSameOriginCoverApi(url)) {
    return probeSameOriginCoverApi(url, Math.max(timeoutMs, 6000));
  }

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
