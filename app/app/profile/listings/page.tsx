import { ListingCard } from "@/components/listings/ListingCard";
import { fetchMyListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Library } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Seller’s active listings (opened from Profile → Listings card).
 * Location: app/app/profile/listings/page.tsx
 */
export default async function ProfileListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const myListings = await fetchMyListings(user.id);

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="flex items-center gap-2 text-primary">
        <Library className="h-6 w-6 shrink-0" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Your listings</h1>
      </div>

      {myListings.length === 0 ? (
        <p className="text-sm text-base-content/60">
          You don&apos;t have any active listings. Use{" "}
          <Link href="/app/sell" className="link link-primary">
            Add
          </Link>{" "}
          in the tab bar to list a book.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {myListings.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} variant="row" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
