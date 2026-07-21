"use server";

import { createClient } from "@/lib/supabase/server";
import { clearProfileReadyCookie } from "@/lib/auth/profileReadyCookie";
import {
  parseSignupBirthday,
  parseSignupDisplayName,
  parseSignupSex,
} from "@/lib/auth/signupProfile";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AuthActionState = {
  error?: string;
  /** Non-error feedback (e.g. password reset email sent). */
  message?: string;
};

function safeNextPath(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

async function appOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

/**
 * Sends Supabase recovery email. Always returns the same success copy (no email enumeration).
 * Add /auth/update-password to Supabase Auth → URL configuration → Redirect URLs.
 */
export async function requestPasswordReset(
  _prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const origin = await appOrigin();
  const next = encodeURIComponent("/auth/update-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${next}`,
  });

  if (error) {
    console.error("[requestPasswordReset]", error.message);
    return { error: error.message };
  }

  return {
    message:
      "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.",
  };
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
  const displayName = parseSignupDisplayName(String(formData.get("display_name") ?? ""));
  const birthdayRaw = String(formData.get("birthday") ?? "");
  const sex = parseSignupSex(String(formData.get("sex") ?? ""));
  const nextRaw = String(formData.get("next") ?? "");
  const next = safeNextPath(nextRaw, "/app/home");
  const acceptedTerms = formData.get("accept_terms") === "on";
  const marketingOptIn = formData.get("marketing_opt_in") === "on";
  const termsAcceptedAt = new Date().toISOString();

  if (!displayName) {
    return { error: "Enter your name (at least 2 characters)." };
  }
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  const birthdayParsed = parseSignupBirthday(birthdayRaw);
  if (!birthdayParsed.ok) {
    return { error: birthdayParsed.error };
  }
  if (!sex) {
    return { error: "Please select sex." };
  }
  if (!acceptedTerms) {
    return {
      error: "Please agree to the Terms & Conditions and Privacy Policy to create an account.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        birthday: birthdayParsed.value,
        sex,
        marketing_opt_in: marketingOptIn,
        terms_accepted_at: termsAcceptedAt,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        birthday: birthdayParsed.value,
        sex,
        marketing_opt_in: marketingOptIn,
        terms_accepted_at: termsAcceptedAt,
      })
      .eq("id", data.user.id);
    if (profileErr) {
      console.warn("[signUpWithPassword] profile update", profileErr.message);
    }
  }

  // Email confirmation enabled: user may need to verify before session exists.
  if (!data.session) {
    return {
      message:
        "Check your email to confirm your account, then sign in to continue.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearProfileReadyCookie();
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
