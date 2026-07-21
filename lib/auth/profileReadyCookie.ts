/**
 * Session cookie so we only run ensureProfileRow once per browser session window.
 * Location: lib/auth/profileReadyCookie.ts
 */
import { cookies } from "next/headers";

export const PROFILE_READY_COOKIE = "ss_prof_ok";

export async function hasProfileReadyCookie(): Promise<boolean> {
  const store = await cookies();
  return store.get(PROFILE_READY_COOKIE)?.value === "1";
}

export async function setProfileReadyCookie(): Promise<void> {
  const store = await cookies();
  store.set(PROFILE_READY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearProfileReadyCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PROFILE_READY_COOKIE);
}
