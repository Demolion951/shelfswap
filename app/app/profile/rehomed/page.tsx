import { RehomedListingRow } from "@/components/listings/RehomedListingRow";
import { fetchMyRehomedListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Seller’s completed (rehomed) listings — opened from Profile → Rehomed card.
 * Location: app/app/profile/rehomed/page.tsx
 */
export default async function ProfileRehomedPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) redirect("/auth/sign-in");

  const rehomedListings = await fetchMyRehomedListings(user.id);

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

      {rehomedListings.length === 0 ? (
        <p className="text-sm text-base-content/50">No completed sales yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rehomedListings.map((l) => (
            <li key={l.id}>
              <RehomedListingRow listing={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
