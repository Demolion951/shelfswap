import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";

/**
 * One server-verified auth lookup per request (dedupes layout + page + query helpers).
 * Location: lib/auth/session.ts
 */
export const getCachedAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[getCachedAuthUser]", error.message);
    return null;
  }
  return data.user ?? null;
});
