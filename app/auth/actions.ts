"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AuthActionState = {
  error?: string;
};

function safeNextPath(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

export async function signInWithPassword(
  _prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const next = safeNextPath(nextRaw, "/app/home");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpWithPassword(
  _prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const nextRaw = String(formData.get("next") ?? "");
  const next = safeNextPath(nextRaw, "/app/home");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || undefined,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation enabled: user may need to verify before session exists.
  if (!data.session) {
    return {
      error:
        "Check your email to confirm your account before signing in (if confirmation is enabled).",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/**
 * Ensures a public.profiles row exists for the current user (backup if the DB trigger did not run).
 */
export async function ensureProfileRow(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Not signed in." };
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "New user";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      avatar_url: null,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
