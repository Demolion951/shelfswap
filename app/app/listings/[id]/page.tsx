import { ListingDetailView } from "@/components/listings/ListingDetailView";
import { fetchBookBlurb } from "@/lib/books/openLibraryBlurb";
import { fetchDistanceKmForListing } from "@/lib/listings/distance";
import {
  fetchListingById,
  fetchListingMessagesIfAllowed,
  fetchMyListings,
  type ListingMessageRow,
} from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { PendingUnlockRequest } from "@/components/listings/UnlockRequestsPanel";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { pickSellerUnlockRow } from "@/lib/listings/unlockDeal";
import { normalizeUnlockCredits } from "@/lib/listings/swapCredits";

type Props = { params: Promise<{ id: string }> };

function parseCreditsSpent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 1);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

function parseSwapCreditsRefunded(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [listing, authRes] = await Promise.all([
    fetchListingById(id),
    supabase.auth.getUser(),
  ]);
  if (!listing) {
    notFound();
  }

  const user = authRes.data.user;
  const isOwner = !!user && user.id === listing.user_id;
  const isSignedIn = !!user;

  if (listing.status !== "active") {
    if (!user) {
      notFound();
    }
    if (!isOwner) {
      const { data: archivedUnlock } = await supabase
        .from("listing_unlocks")
        .select("id")
        .eq("listing_id", id)
        .eq("buyer_id", user.id)
        .maybeSingle();
      if (!archivedUnlock) {
        notFound();
      }
    }
  }

  let hasPremium = false;
  let viewerUnlocked = false;
  let viewerSaved = false;
  let viewerPendingUnlock = false;
  let pendingRequestsForSeller: PendingUnlockRequest[] = [];
  let unlockDeal: {
    buyerId: string;
    dealType: "pickup" | "swap";
    swapStatus: "proposed" | "accepted" | "declined" | null;
    offeredListingId: string | null;
    offeredTitle: string | null;
    offeredCredits: number | null;
    creditsSpent: number;
    swapCreditsRefunded: number;
    buyerConfirmedAt: string | null;
    sellerConfirmedAt: string | null;
    completedAt: string | null;
    unlockCreatedAt: string | null;
    buyerMutualCancelAt: string | null;
    sellerMutualCancelAt: string | null;
  } | null = null;
  let buyerOfferOptions: Array<{ id: string; title: string }> = [];
  let creditsPendingSellerReply = false;
  if (user) {
    const pendingReqPromise =
      !isOwner
        ? supabase
            .from("listing_unlock_requests")
            .select("id")
            .eq("buyer_id", user.id)
            .eq("listing_id", id)
            .eq("status", "pending")
            .maybeSingle()
        : Promise.resolve({ data: null as { id: string } | null });

    const [expRes, profRes, unlockRes, saveRes, pendingReqRes] = await Promise.all([
      supabase.rpc("expire_listing_unlock_requests", { p_listing_id: id }),
      supabase
        .from("profiles")
        .select("subscription_status, subscription_period_end")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("listing_unlocks")
        .select("id, balance_captured_at")
        .eq("buyer_id", user.id)
        .eq("listing_id", id)
        .maybeSingle(),
      supabase
        .from("saved_listings")
        .select("listing_id")
        .eq("user_id", user.id)
        .eq("listing_id", id)
        .maybeSingle(),
      pendingReqPromise,
    ]);
    if (expRes.error) {
      console.warn("[ListingPage] expire_listing_unlock_requests", expRes.error.message);
    }
    const prof = profRes.data as {
      subscription_status?: string | null;
      subscription_period_end?: string | null;
    } | null;
    hasPremium =
      prof?.subscription_status === "active" ||
      prof?.subscription_status === "trialing";
    if (prof?.subscription_period_end) {
      const end = new Date(prof.subscription_period_end);
      if (end.getTime() <= Date.now()) hasPremium = false;
    }

    viewerUnlocked = !!unlockRes.data;
    viewerSaved = !!saveRes.data;
    const unlockMeta = unlockRes.data as {
      id?: string;
      balance_captured_at?: string | null;
    } | null;
    creditsPendingSellerReply =
      !!viewerUnlocked &&
      !isOwner &&
      !!unlockMeta &&
      unlockMeta.balance_captured_at == null;

    if (!viewerUnlocked && !isOwner) {
      viewerPendingUnlock = !!(pendingReqRes as { data?: { id: string } | null }).data;
    }

    // Seller already messaged but unlock row missing (e.g. chat before accept-on-reply migration).
    if (!isOwner && !viewerUnlocked && viewerPendingUnlock) {
      const { data: recon, error: reconErr } = await supabase.rpc(
        "reconcile_unlock_accept_after_seller_reply",
        { p_listing_id: id },
      );
      if (reconErr) {
        console.warn("[ListingPage] reconcile_unlock_accept_after_seller_reply", reconErr.message);
      } else if ((recon as { accepted?: boolean } | null)?.accepted === true) {
        const [unlockAgain, pendingAgain] = await Promise.all([
          supabase
            .from("listing_unlocks")
            .select("id, balance_captured_at")
            .eq("buyer_id", user.id)
            .eq("listing_id", id)
            .maybeSingle(),
          supabase
            .from("listing_unlock_requests")
            .select("id")
            .eq("buyer_id", user.id)
            .eq("listing_id", id)
            .eq("status", "pending")
            .maybeSingle(),
        ]);
        viewerUnlocked = !!unlockAgain.data;
        viewerPendingUnlock = !viewerUnlocked && !!pendingAgain.data;
        const meta = unlockAgain.data as { balance_captured_at?: string | null } | null;
        creditsPendingSellerReply =
          !!viewerUnlocked && !!meta && meta.balance_captured_at == null;
      }
    }
  }

  // Deal state: only after listing_unlocks exists (not during pending request-only phase).
  if ((isOwner || viewerUnlocked) && user) {
    if (isOwner) {
      const { data: unlockRows } = await supabase
        .from("listing_unlocks")
        .select(
          "buyer_id, deal_type, swap_status, offered_listing_id, buyer_confirmed_at, seller_confirmed_at, completed_at, credits_spent, swap_credits_refunded, created_at, buyer_mutual_cancel_at, seller_mutual_cancel_at",
        )
        .eq("listing_id", id)
        .order("created_at", { ascending: false })
        .limit(24);
      const u = pickSellerUnlockRow(unlockRows ?? null);
      if (u) {
        let offeredTitle: string | null = null;
        let offeredCredits: number | null = null;
        if (u.offered_listing_id) {
          const { data: ol } = await supabase
            .from("listings")
            .select("title, unlock_credits")
            .eq("id", u.offered_listing_id)
            .maybeSingle();
          offeredTitle = (ol?.title as string | null) ?? null;
          if (ol) offeredCredits = normalizeUnlockCredits(ol.unlock_credits);
        }
        unlockDeal = {
          buyerId: String(u.buyer_id),
          dealType: (u.deal_type as any) === "swap" ? "swap" : "pickup",
          swapStatus: (u.swap_status as any) ?? null,
          offeredListingId: (u.offered_listing_id as any) ?? null,
          offeredTitle,
          offeredCredits,
          creditsSpent: parseCreditsSpent(u.credits_spent),
          swapCreditsRefunded: parseSwapCreditsRefunded(u.swap_credits_refunded),
          buyerConfirmedAt: (u.buyer_confirmed_at as any) ?? null,
          sellerConfirmedAt: (u.seller_confirmed_at as any) ?? null,
          completedAt: (u.completed_at as any) ?? null,
          unlockCreatedAt: (u.created_at as any) ?? null,
          buyerMutualCancelAt: (u.buyer_mutual_cancel_at as any) ?? null,
          sellerMutualCancelAt: (u.seller_mutual_cancel_at as any) ?? null,
        };
      }
    } else if (viewerUnlocked) {
      const { data: u } = await supabase
        .from("listing_unlocks")
        .select(
          "buyer_id, deal_type, swap_status, offered_listing_id, buyer_confirmed_at, seller_confirmed_at, completed_at, credits_spent, swap_credits_refunded, created_at, buyer_mutual_cancel_at, seller_mutual_cancel_at",
        )
        .eq("listing_id", id)
        .eq("buyer_id", user.id)
        .maybeSingle();
      if (u) {
        let offeredTitle: string | null = null;
        let offeredCredits: number | null = null;
        if (u.offered_listing_id) {
          const { data: ol } = await supabase
            .from("listings")
            .select("title, unlock_credits")
            .eq("id", u.offered_listing_id)
            .maybeSingle();
          offeredTitle = (ol?.title as string | null) ?? null;
          if (ol) offeredCredits = normalizeUnlockCredits(ol.unlock_credits);
        }
        unlockDeal = {
          buyerId: String(u.buyer_id),
          dealType: (u.deal_type as any) === "swap" ? "swap" : "pickup",
          swapStatus: (u.swap_status as any) ?? null,
          offeredListingId: (u.offered_listing_id as any) ?? null,
          offeredTitle,
          offeredCredits,
          creditsSpent: parseCreditsSpent(u.credits_spent),
          swapCreditsRefunded: parseSwapCreditsRefunded(u.swap_credits_refunded),
          buyerConfirmedAt: (u.buyer_confirmed_at as any) ?? null,
          sellerConfirmedAt: (u.seller_confirmed_at as any) ?? null,
          completedAt: (u.completed_at as any) ?? null,
          unlockCreatedAt: (u.created_at as any) ?? null,
          buyerMutualCancelAt: (u.buyer_mutual_cancel_at as any) ?? null,
          sellerMutualCancelAt: (u.seller_mutual_cancel_at as any) ?? null,
        };
      }

      const mine = await fetchMyListings(user.id, 50);
      buyerOfferOptions = (mine ?? [])
        .filter((l: ListingWithRelations) => l.id !== id)
        .map((l: ListingWithRelations) => ({ id: l.id, title: l.title }));
    }
  }

  if (isOwner && user) {
    const { data: reqs, error } = await supabase
      .from("listing_unlock_requests")
      .select("id, buyer_id, credits_held, created_at")
      .eq("listing_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[ListingPage] listing_unlock_requests", error.message);
    }
    const rows = (reqs ?? []) as Array<{
      id: string;
      buyer_id: string;
      credits_held: number;
      created_at: string;
    }>;
    const buyerIds = rows.map((r) => r.buyer_id);
    let buyerMap = new Map<string, string>();
    if (buyerIds.length > 0) {
      const { data: profs } = await supabase.rpc("profiles_public_batch", {
        p_user_ids: buyerIds,
      });
      const pr = (profs ?? []) as Array<{ id: string; display_name: string | null }>;
      buyerMap = new Map(pr.map((p) => [String(p.id), (p.display_name ?? "").trim() || "member"]));
    }
    pendingRequestsForSeller = rows.map((r) => ({
      id: r.id,
      buyerId: r.buyer_id,
      buyerHandle: buyerMap.get(r.buyer_id) ?? "member",
      creditsHeld: r.credits_held,
      createdAt: r.created_at,
    }));
  }

  async function copyListingGeoFromProfileIfNeeded(): Promise<void> {
    if (!(isOwner && user)) return;
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
    if (!missingGeo) return;
    const { error: copyErr } = await supabase.rpc("copy_listing_geo_from_profile", {
      p_listing_id: id,
    });
    if (copyErr) {
      console.warn("[ListingPage] copy_listing_geo_from_profile", copyErr.message);
    }
  }

  const [messages, , distanceKm, initialBlurb] = await Promise.all([
    isOwner || viewerUnlocked || viewerPendingUnlock
      ? fetchListingMessagesIfAllowed(id)
      : Promise.resolve([] as ListingMessageRow[]),
    copyListingGeoFromProfileIfNeeded(),
    !isOwner ? fetchDistanceKmForListing(id, user?.id ?? null) : Promise.resolve(null),
    fetchBookBlurb(listing.isbn, listing.title, listing.author),
  ]);

  return (
    <ListingDetailView
      listing={listing}
      isOwner={isOwner}
      isSignedIn={isSignedIn}
      viewerUnlocked={viewerUnlocked}
      creditBalance={0}
      heldCredits={0}
      hasPremium={hasPremium}
      viewerPendingUnlock={viewerPendingUnlock}
      pendingRequestsForSeller={pendingRequestsForSeller}
      unlockDeal={unlockDeal}
      buyerOfferOptions={buyerOfferOptions}
      currentUserId={user?.id ?? null}
      messages={messages}
      distanceKm={distanceKm}
      viewerSaved={viewerSaved}
      creditsPendingSellerReply={creditsPendingSellerReply}
      initialBlurb={initialBlurb}
    />
  );
}
