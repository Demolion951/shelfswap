"use server";

/**
 * Saves viewer rough area (~2 decimal degrees) for approximate distance on listings.
 * Location: app/app/profile/location-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { reverseGeocodeAreaText } from "@/lib/geo/reverseGeocode";
import { revalidatePath } from "next/cache";

export type LocationActionResult = { ok: true } | { ok: false; error: string };

export async function setMyApproxLocationAction(
  lat: number,
  lng: number,
): Promise<LocationActionResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "Invalid coordinates." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to save your area." };
  }

  const { error } = await supabase.rpc("set_my_approx_location", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    console.error("[setMyApproxLocationAction]", error.message);
    return {
      ok: false,
      error:
        error.message.includes("out of range") || error.message.includes("range")
          ? "Location looks invalid. Try again."
          : error.message,
    };
  }

  // Best-effort: store a human-friendly rough area label on profile, then align all active listings.
  let areaText: string | null = null;
  try {
    areaText = await reverseGeocodeAreaText(lat, lng);
    if (areaText) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ approx_area_text: areaText })
        .eq("id", user.id);
      if (upErr) {
        console.warn("[setMyApproxLocationAction] approx_area_text", upErr.message);
      }
    }
  } catch (e) {
    console.warn("[setMyApproxLocationAction] reverse geocode failed", e);
  }

  const { error: syncErr } = await supabase.rpc("sync_my_active_listings_location_from_profile", {
    p_approx_area_text: areaText?.trim() || null,
  });
  if (syncErr) {
    console.warn(
      "[setMyApproxLocationAction] sync_my_active_listings_location_from_profile",
      syncErr.message,
    );
  }

  revalidatePath("/app/profile");
  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/messages");
  revalidatePath("/app/browse");
  // So listing detail / feeds pick up new viewer location without a stale shell.
  revalidatePath("/app", "layout");
  return { ok: true };
}
