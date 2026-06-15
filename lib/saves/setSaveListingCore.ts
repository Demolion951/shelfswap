/**
 * Save-listing toggle (DB only) — shared by server action and /api/saves (no cache revalidation).
 * Location: lib/saves/setSaveListingCore.ts
 */
import { createClient } from "@/lib/supabase/server";

export type SaveToggleResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

export async function setSaveListingCore(
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
    console.error("[setSaveListingCore] existing", exErr.message);
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
      console.error("[setSaveListingCore] delete", delErr.message);
      return { ok: false, error: delErr.message };
    }
    return { ok: true, saved: false };
  }

  const { error: insErr } = await supabase.from("saved_listings").insert({
    user_id: user.id,
    listing_id: listingId,
  });
  if (insErr) {
    console.error("[setSaveListingCore] insert", insErr.message);
    return { ok: false, error: insErr.message };
  }

  const { error: evErr } = await supabase.from("events").insert({
    user_id: user.id,
    type: "save_listing",
    listing_id: listingId,
    payload: {},
  });
  if (evErr) {
    console.warn("[setSaveListingCore] event", evErr.message);
  }

  return { ok: true, saved: true };
}
