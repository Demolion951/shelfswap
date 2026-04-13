import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { fetchOpenLibraryBlurbByIsbn } from "@/lib/books/openLibraryBlurb";
import { fetchDistanceKmForListing } from "@/lib/listings/distance";
import {
  fetchListingById,
  fetchListingMessagesIfAllowed,
  type ListingMessageRow,
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
  let viewerSaved = false;
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

    const { data: saveRow } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle();
    viewerSaved = !!saveRow;
  }

  let messages: ListingMessageRow[] = [];
  let distanceKm: number | null = null;
  const blurb = listing.isbn ? await fetchOpenLibraryBlurbByIsbn(listing.isbn) : null;
  if (isOwner || viewerUnlocked) {
    messages = await fetchListingMessagesIfAllowed(id);
  }

  // Distance needs listings.approx_geo *and* viewer profiles.approx_location. Older listings
  // may lack geo if the seller had no profile area at post time — copy when they open the page.
  if (isOwner && user) {
    const { data: geoRow } = await supabase
      .from("listings")
      .select("approx_geo")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const raw = geoRow?.approx_geo as unknown;
    const missingGeo = (() => {
      if (raw == null) return true;
      if (typeof raw === "string") return raw.trim().length === 0;
      if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const coords = (raw as { coordinates?: unknown }).coordinates;
        return !Array.isArray(coords) || coords.length < 2;
      }
      return false;
    })();
    if (missingGeo) {
      const { error: copyErr } = await supabase.rpc("copy_listing_geo_from_profile", {
        p_listing_id: id,
      });
      if (copyErr) {
        console.warn("[ListingPage] copy_listing_geo_from_profile", copyErr.message);
      }
    }
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
      messages={messages}
      distanceKm={distanceKm}
      blurb={blurb}
      viewerSaved={viewerSaved}
    />
  );
}
