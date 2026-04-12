import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { fetchDistanceKmForListing } from "@/lib/listings/distance";
import {
  fetchListingById,
  fetchListingMessagesIfAllowed,
  fetchListingPickupIfAllowed,
  type ListingMessageRow,
  type ListingPickupRow,
} from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await fetchListingById(id);
  if (!listing || listing.status !== "active") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === listing.user_id;
  const isSignedIn = !!user;

  let creditBalance = 0;
  let viewerUnlocked = false;
  if (user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("credit_balance")
      .eq("id", user.id)
      .maybeSingle();
    const bal = prof?.credit_balance;
    creditBalance = typeof bal === "number" ? bal : Number(bal ?? 0) || 0;

    const { data: unlockRow } = await supabase
      .from("listing_unlocks")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("listing_id", id)
      .maybeSingle();
    viewerUnlocked = !!unlockRow;
  }

  let pickup: ListingPickupRow | null = null;
  let messages: ListingMessageRow[] = [];
  let distanceKm: number | null = null;
  if (isOwner || viewerUnlocked) {
    const [p, m] = await Promise.all([
      fetchListingPickupIfAllowed(id),
      fetchListingMessagesIfAllowed(id),
    ]);
    pickup = p;
    messages = m;
  }

  if (!isOwner) {
    distanceKm = await fetchDistanceKmForListing(id);
  }

  return (
    <ListingDetailView
      listing={listing}
      isOwner={isOwner}
      isSignedIn={isSignedIn}
      viewerUnlocked={viewerUnlocked}
      creditBalance={creditBalance}
      currentUserId={user?.id ?? null}
      pickup={pickup}
      messages={messages}
      distanceKm={distanceKm}
    />
  );
}
