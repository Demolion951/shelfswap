import { ListingCard } from "@/components/listings/ListingCard";
import { fetchSavedListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Listings the user has saved (heart) for quick access from Profile.
 * Location: app/app/profile/saved/page.tsx
 */
export default async function ProfileSavedPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) redirect("/auth/sign-in");

  const saved = await fetchSavedListings(user.id);

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="flex items-center gap-2 text-error">
        <Heart className="h-6 w-6 shrink-0 fill-current" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Saved</h1>
      </div>

      {saved.length === 0 ? (
        <p className="text-sm text-base-content/60">
          Nothing saved yet. Tap the heart on a listing to keep it here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {saved.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} variant="row" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
