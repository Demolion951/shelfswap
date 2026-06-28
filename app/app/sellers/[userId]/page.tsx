import { ListingCard } from "@/components/listings/ListingCard";
import { fetchMyListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Library } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ userId: string }> };

/**
 * Public shelf for one seller's active listings (linked from listing detail before unlock).
 * Location: app/app/sellers/[userId]/page.tsx
 */
export default async function SellerListingsPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();

  const [{ data: profiles }, listings] = await Promise.all([
    supabase.rpc("profiles_public_batch", { p_user_ids: [userId] }),
    fetchMyListings(userId),
  ]);

  const profileRow = (profiles ?? [])[0] as
    | { id: string; display_name: string | null; avatar_url: string | null }
    | undefined;

  if (!profileRow && listings.length === 0) {
    notFound();
  }

  const sellerName = profileRow?.display_name?.trim() || "Seller";

  return (
    <div className="space-y-6 pb-8 pt-2">
      <Link href="/app/home" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Library className="h-6 w-6 shrink-0" aria-hidden />
          <h1 className="shelfswap-heading text-xl font-semibold">@{sellerName}</h1>
        </div>
        <p className="text-sm text-base-content/60">
          {listings.length === 0
            ? "No active listings right now."
            : `${listings.length} book${listings.length === 1 ? "" : "s"} for sale or swap`}
        </p>
      </div>

      {listings.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} variant="grid" compact />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
