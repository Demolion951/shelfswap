"use server";

/**
 * Browse vs home rough locations: browse updates discovery distances; home is fixed on listings.
 * Location: app/app/profile/location-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { geocodeUkPostcode } from "@/lib/geo/geocodePostcode";
import { reverseGeocodeAreaText } from "@/lib/geo/reverseGeocode";
import { revalidatePath } from "next/cache";

export type LocationActionResult = { ok: true } | { ok: false; error: string };

function revalidateLocationPaths() {
  revalidatePath("/app/profile");
  revalidatePath("/app/profile/settings");
  revalidatePath("/app/profile/location");
  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/browse");
  revalidatePath("/app", "layout");
}

/** Current area while browsing (Home, Search, Browse distances). Does not move your listings. */
export async function setMyBrowseLocationAction(
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
    console.error("[setMyBrowseLocationAction]", error.message);
    return {
      ok: false,
      error:
        error.message.includes("out of range") || error.message.includes("range")
          ? "Location looks invalid. Try again."
          : error.message,
    };
  }

  try {
    const areaText = await reverseGeocodeAreaText(lat, lng);
    if (areaText) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ approx_area_text: areaText })
        .eq("id", user.id);
      if (upErr) {
        console.warn("[setMyBrowseLocationAction] approx_area_text", upErr.message);
      }
    }
  } catch (e) {
    console.warn("[setMyBrowseLocationAction] reverse geocode failed", e);
  }

  revalidateLocationPaths();
  return { ok: true };
}

/** @deprecated Use setMyBrowseLocationAction — kept for AutoApproxLocationUpdater import path. */
export async function setMyApproxLocationAction(
  lat: number,
  lng: number,
): Promise<LocationActionResult> {
  return setMyBrowseLocationAction(lat, lng);
}

/** Home area from UK postcode — listings show town/area only, not the postcode. */
export async function setMyHomeFromPostcodeAction(
  postcode: string,
): Promise<LocationActionResult> {
  const geo = await geocodeUkPostcode(postcode);
  if (!geo.ok) {
    return { ok: false, error: geo.error };
  }
  return setMyHomeLocationAction(geo.lat, geo.lng, geo.areaLabel);
}

/** Fixed area where your books live — shown on listings; updates active listing locations. */
export async function setMyHomeLocationAction(
  lat: number,
  lng: number,
  areaLabelOverride?: string | null,
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

  const { error } = await supabase.rpc("set_my_home_approx_location", {
    p_lat: lat,
    p_lng: lng,
  });

  if (error) {
    console.error("[setMyHomeLocationAction]", error.message);
    return {
      ok: false,
      error:
        error.message.includes("out of range") || error.message.includes("range")
          ? "Location looks invalid. Try again."
          : error.message,
    };
  }

  let areaText: string | null = areaLabelOverride?.trim() || null;
  if (!areaText) {
    try {
      areaText = await reverseGeocodeAreaText(lat, lng);
    } catch (e) {
      console.warn("[setMyHomeLocationAction] reverse geocode failed", e);
    }
  }
  if (areaText) {
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ home_approx_area_text: areaText })
      .eq("id", user.id);
    if (upErr) {
      console.warn("[setMyHomeLocationAction] home_approx_area_text", upErr.message);
    }
  }

  const { error: syncErr } = await supabase.rpc("sync_my_active_listings_from_home", {
    p_home_area_text: areaText?.trim() || null,
  });
  if (syncErr) {
    console.warn("[setMyHomeLocationAction] sync_my_active_listings_from_home", syncErr.message);
  }

  revalidateLocationPaths();
  revalidatePath("/app/profile/listings");
  return { ok: true };
}
