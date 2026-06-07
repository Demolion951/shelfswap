import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every matched request and rewrites auth cookies on the response.
 * Required for reliable SSR auth with @supabase/ssr (avoid stale tokens and random logouts).
 */
/** Cover/blurb proxies are hot paths — skip auth round-trip per image request. */
const FAST_API_PREFIXES = ["/api/openlibrary-cover", "/api/openlibrary-blurb"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (FAST_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        if (headersToSet) {
          Object.entries(headersToSet).forEach(([k, v]) => {
            response.headers.set(k, v);
          });
        }
      },
    },
  });

  // Validates JWT with Auth server — do not use getSession() alone for security decisions.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and images. Everything else runs through auth refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
