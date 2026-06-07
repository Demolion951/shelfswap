"use server";

/**
 * Saves (favorites): toggle and read state for listing pages.
 * Location: app/app/saves/actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { logEventAction } from "@/app/app/events/actions";
import { revalidatePath } from "next/cache";

export type SaveToggleResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

function revalidateSavePaths(listingId: string) {
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/profile/saved");
}

/** Set saved state explicitly (used by feed hearts for reliable rapid toggles). */
export async function setSaveListingAction(
  listingId: string,
  shouldSave: boolean,
): Promise<SaveToggleResult> {
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
    console.error("[setSaveListingAction] existing", exErr.message);
    return { ok: false, error: exErr.message };
  }

  const isSaved = !!existing;

  if (shouldSave && isSaved) {
    return { ok: true, saved: true };
  }
  if (!shouldSave && !isSaved) {
    return { ok: true, saved: false };
  }

  if (!shouldSave) {
    const { error: delErr } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (delErr) {
      console.error("[setSaveListingAction] delete", delErr.message);
      return { ok: false, error: delErr.message };
    }
    revalidateSavePaths(listingId);
    return { ok: true, saved: false };
  }

  const { error: insErr } = await supabase.from("saved_listings").insert({
    user_id: user.id,
    listing_id: listingId,
  });
  if (insErr) {
    console.error("[setSaveListingAction] insert", insErr.message);
    return { ok: false, error: insErr.message };
  }

  await logEventAction({ type: "save_listing", listingId });
  revalidateSavePaths(listingId);
  return { ok: true, saved: true };
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

  if (existing) {
    const { error: delErr } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (delErr) {
      console.error("[toggleSaveListingAction] delete", delErr.message);
      return { ok: false, error: delErr.message };
    }
    revalidateSavePaths(listingId);
    return { ok: true, saved: false };
  }

  const { error: insErr } = await supabase.from("saved_listings").insert({
    user_id: user.id,
    listing_id: listingId,
  });
  if (insErr) {
    console.error("[toggleSaveListingAction] insert", insErr.message);
    return { ok: false, error: insErr.message };
  }

  await logEventAction({ type: "save_listing", listingId });
  revalidateSavePaths(listingId);
  return { ok: true, saved: true };
}

