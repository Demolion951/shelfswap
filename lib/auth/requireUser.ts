import { getCachedAuthUser } from "@/lib/auth/session";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export type RequireUserOptions = {
  /** Where to send unauthenticated users */
  loginPath?: string;
  /** App path to return to after sign-in (query: next=) */
  returnTo?: string;
};

/**
 * Returns the current user or redirects to sign-in.
 * Uses getUser() (server-verified) — safe for protecting server-rendered routes and actions.
 */
export async function requireUser(options?: RequireUserOptions): Promise<User> {
  const loginPath = options?.loginPath ?? "/auth/sign-in";
  const user = await getCachedAuthUser();

  if (!user) {
    const next = options?.returnTo;
    const dest =
      next && next.startsWith("/")
        ? `${loginPath}?next=${encodeURIComponent(next)}`
        : loginPath;
    redirect(dest);
  }

  return user;
}

/**
 * Same as getUser() but returns null instead of redirecting. Use for optional auth UI.
 */
export async function getOptionalUser() {
  return getCachedAuthUser();
}
