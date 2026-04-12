"use server";

/**
 * Saves viewer rough area (~2 decimal degrees) for approximate distance on listings.
 * Location: app/app/profile/location-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
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

  revalidatePath("/app/profile");
  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/messages");
  return { ok: true };
}
