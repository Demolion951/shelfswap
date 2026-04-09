import { createBrowserClient } from "@supabase/ssr";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return { url, key };
}

/**
 * Browser-only Supabase client (PKCE + cookies via @supabase/ssr).
 * Use in Client Components and auth forms — never import this from Server Components.
 */
export function createBrowserSupabaseClient() {
  const { url, key } = getEnv();
  return createBrowserClient(url, key);
}
