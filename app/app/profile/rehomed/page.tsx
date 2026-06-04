import { RehomedTabs } from "@/components/listings/RehomedTabs";
import { fetchMyRehomedListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Completed handoffs — passed on and swaps (opened from Profile → Rehomed).
 * Location: app/app/profile/rehomed/page.tsx
 */
export default async function ProfileRehomedPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) redirect("/auth/sign-in");

  const { pickups, swaps } = await fetchMyRehomedListings(user.id);
  const total = pickups.length + swaps.length;

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="flex items-center gap-2 text-success">
        <Home className="h-6 w-6 shrink-0" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Rehomed</h1>
      </div>

      <p className="text-sm text-base-content/60">
        Books you&apos;ve handed over after a completed deal.
      </p>

      {total === 0 ? (
        <p className="text-sm text-base-content/50">No completed handoffs yet.</p>
      ) : (
        <RehomedTabs pickups={pickups} swaps={swaps} />
      )}
    </div>
  );
}
