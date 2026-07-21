import { ListingCard } from "@/components/listings/ListingCard";
import { ProfileKarmaBadge } from "@/components/profile/ProfileKarmaBadge";
import { ReportAbuseButton } from "@/components/reports/ReportAbuseButton";
import { karmaStatsFromPublicProfile } from "@/lib/profile/karma";
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

  const [{ data: profiles }, listings, auth] = await Promise.all([
    supabase.rpc("profiles_public_batch", { p_user_ids: [userId] }),
    fetchMyListings(userId),
    supabase.auth.getUser(),
  ]);

  const profileRow = (profiles ?? [])[0] as
    | {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        completed_pickups_count?: number;
        completed_sales_count?: number;
        completed_swaps_count?: number;
      }
    | undefined;

  const karmaStats = karmaStatsFromPublicProfile(profileRow ?? null);
  const viewerId = auth.data.user?.id ?? null;
  const canReport = Boolean(viewerId && viewerId !== userId);

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

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-primary">
            <Library className="h-6 w-6 shrink-0" aria-hidden />
            <h1 className="shelfswap-heading text-xl font-semibold">@{sellerName}</h1>
            <ProfileKarmaBadge stats={karmaStats} showCount />
          </div>
          <p className="text-sm text-base-content/60">
            {listings.length === 0
              ? "No active listings right now."
              : `${listings.length} book${listings.length === 1 ? "" : "s"} for sale or swap`}
          </p>
        </div>
        {canReport ? (
          <ReportAbuseButton
            reportedUserId={userId}
            reportedDisplayName={sellerName}
            label="Report user"
          />
        ) : null}
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
