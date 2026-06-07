/**
 * Upload listing photos one at a time via API (avoids multi-file server action limits).
 * Location: lib/client/uploadListingPhotos.ts
 */
import { compressListingPhoto } from "@/lib/client/compressListingPhoto";

export type UploadPhotosResult =
  | { ok: true }
  | { ok: false; error: string; uploaded: number };

export async function uploadListingPhotos(
  listingId: string,
  files: File[],
  sortStart = 0,
  onProgress?: (current: number, total: number) => void,
): Promise<UploadPhotosResult> {
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const compressed = await compressListingPhoto(files[i]);
    const body = new FormData();
    body.append("listing_id", listingId);
    body.append("sort", String(sortStart + i));
    body.append("photo", compressed);

    let json: { ok?: boolean; error?: string };
    try {
      const res = await fetch("/api/listings/photos", { method: "POST", body });
      json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        return {
          ok: false,
          error: json.error ?? "Photo upload failed.",
          uploaded: i,
        };
      }
    } catch {
      return { ok: false, error: "Photo upload failed. Check your connection.", uploaded: i };
    }
  }
  return { ok: true };
}
