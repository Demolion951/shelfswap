"use server";

/**
 * Saves (favorites): server actions with cache revalidation for profile/detail pages.
 * Feed hearts use POST /api/saves instead to avoid full-page refresh.
 * Location: app/app/saves/actions.ts
 */
import { setSaveListingCore, type SaveToggleResult } from "@/lib/saves/setSaveListingCore";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type { SaveToggleResult };

function revalidateSavePaths(listingId: string) {
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/profile/saved");
}

/** Set saved state (server action — revalidates; prefer /api/saves on listing grids). */
export async function setSaveListingAction(
  listingId: string,
  shouldSave: boolean,
): Promise<SaveToggleResult> {
  const res = await setSaveListingCore(listingId, shouldSave);
  if (res.ok) {
    revalidateSavePaths(listingId);
  }
  return res;
}

export async function toggleSaveListingAction(listingId: string): Promise<SaveToggleResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to save listings." };

  const { data: existing, error: exErr } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (exErr) {
    console.error("[toggleSaveListingAction] existing", exErr.message);
    return { ok: false, error: exErr.message };
  }

  return setSaveListingAction(listingId, !existing);
}
