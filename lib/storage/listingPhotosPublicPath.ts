/**
 * Parse Supabase public URL → storage object path in listing-photos bucket.
 * Location: lib/storage/listingPhotosPublicPath.ts
 */

const MARKER = "/storage/v1/object/public/listing-photos/";

export function storagePathFromListingPhotoPublicUrl(publicUrl: string): string | null {
  const i = publicUrl.indexOf(MARKER);
  if (i === -1) return null;
  const path = publicUrl.slice(i + MARKER.length).split("?")[0]?.trim();
  return path || null;
}
