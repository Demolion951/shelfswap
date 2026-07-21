/**
 * Ensures profiles row exists (backup if DB trigger missed). Cookie-gated for fast tab switches.
 * Location: lib/auth/ensureProfile.ts
 */
import {
  clearProfileReadyCookie,
  hasProfileReadyCookie,
  setProfileReadyCookie,
} from "@/lib/auth/profileReadyCookie";
import { getCachedAuthUser } from "@/lib/auth/session";
import { parseSignupBirthday, parseSignupSex } from "@/lib/auth/signupProfile";
import { createClient } from "@/lib/supabase/server";
import { after } from "next/server";
import { cache } from "react";

/**
 * Ensures a public.profiles row exists for the current user.
 * Deduped per request via React cache.
 */
export const ensureProfileRow = cache(
  async (): Promise<{ ok: true } | { error: string }> => {
    const user = await getCachedAuthUser();
    if (!user) {
      return { error: "Not signed in." };
    }

    const supabase = await createClient();

    const displayName =
      (user.user_metadata?.display_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "New user";
    const birthdayRaw = (user.user_metadata?.birthday as string | undefined)?.trim() || null;
    const sexRaw = (user.user_metadata?.sex as string | undefined)?.trim() || null;
    const sex = parseSignupSex(sexRaw ?? "");
    let birthday: string | null = null;
    if (birthdayRaw) {
      const parsed = parseSignupBirthday(birthdayRaw);
      if (parsed.ok) birthday = parsed.value;
    }

    const { data: existing, error: selErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (selErr) {
      return { error: selErr.message };
    }
    if (existing) {
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      avatar_url: null,
      birthday,
      sex,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: true };
      }
      return { error: error.message };
    }
    return { ok: true };
  },
);

/** Layout helper: no DB work when this browser already confirmed a profiles row. */
export async function ensureProfileRowIfNeeded(): Promise<{ ok: true } | { error: string }> {
  if (await hasProfileReadyCookie()) {
    return { ok: true };
  }
  const result = await ensureProfileRow();
  if ("ok" in result) {
    after(() => {
      void setProfileReadyCookie();
    });
  }
  return result;
}

export { clearProfileReadyCookie };
