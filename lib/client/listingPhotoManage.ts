/**
 * Delete or reorder existing listing photos via API (edit listing flow).
 * Location: lib/client/listingPhotoManage.ts
 */

export type SimpleClientResult = { ok: true } | { ok: false; error: string };

export async function deleteListingPhoto(photoId: string): Promise<SimpleClientResult> {
  try {
    const res = await fetch(
      `/api/listings/photos?photo_id=${encodeURIComponent(photoId)}`,
      { method: "DELETE" },
    );
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "Could not remove photo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not remove photo. Check your connection." };
  }
}

export async function reorderListingPhotos(
  listingId: string,
  photoIds: string[],
): Promise<SimpleClientResult> {
  try {
    const res = await fetch("/api/listings/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, photo_ids: photoIds }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "Could not reorder photos." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reorder photos. Check your connection." };
  }
}
