import { GuestAccountPrompt } from "@/components/auth/GuestAccountPrompt";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { SettingsRow } from "@/components/SettingsRow";
import {
  getMyActiveListingsCount,
  getMyRehomedCount,
  getSavedListingsCount,
} from "@/lib/listings/queries";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";
import { isPremiumStatus } from "@/lib/subscription/constants";
import { ChevronRight, Crown, Heart, Home, Library, Settings2, UserRound } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <GuestAccountPrompt
        title="Your account"
        description="Sign in to list books, save favourites, unlock titles, and manage Premium."
        Icon={UserRound}
        returnTo="/app/profile"
      />
    );
  }

  const supabase = await createClient();
  const [profileRes, listingsCount, rehomedCount, savedCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, subscription_status, subscription_period_end")
      .eq("id", user.id)
      .maybeSingle(),
    getMyActiveListingsCount(user.id),
    getMyRehomedCount(user.id),
    getSavedListingsCount(user.id),
  ]);
  const profile = profileRes.data;
  const premiumActive = isPremiumStatus(profile?.subscription_status ?? "none");

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-4">
        <div className="avatar placeholder shrink-0">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-base-300/60">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
                width={64}
                height={64}
              />
            ) : (
              <span className="w-full text-center text-2xl font-serif leading-none select-none">
                {(profile?.display_name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="shelfswap-heading text-2xl font-semibold truncate">
            {profile?.display_name ?? "Reader"}
          </h1>
          <p className="text-xs text-base-content/50 truncate">{user.email}</p>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <ul className="divide-y divide-base-300/60">
          <SettingsRow href="/app/profile/settings" Icon={Settings2} title="App settings" />
        </ul>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:gap-3">
        <Link
          href="/app/subscribe"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/35 w-full"
        >
          <div className="card-body flex flex-row items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Crown
                className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Premium
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-sm font-semibold sm:text-base">
                {premiumActive ? "Active" : "Subscribe"}
              </p>
              <ChevronRight
                className="h-4 w-4 text-base-content/35"
                aria-hidden
              />
            </div>
          </div>
        </Link>
        <Link
          href="/app/profile/listings"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-secondary/35 w-full"
        >
          <div className="card-body flex flex-row items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Library
                className="h-5 w-5 shrink-0 text-secondary sm:h-6 sm:w-6"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  Listings
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-2xl font-bold sm:text-3xl">{listingsCount}</p>
              <ChevronRight
                className="h-4 w-4 text-base-content/35"
                aria-hidden
              />
            </div>
          </div>
        </Link>
        <Link
          href="/app/profile/rehomed"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-success/35 w-full"
        >
          <div className="card-body flex flex-row items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Home
                className="h-5 w-5 shrink-0 text-success sm:h-6 sm:w-6"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-success">
                  Rehomed
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-2xl font-bold sm:text-3xl">{rehomedCount}</p>
              <ChevronRight
                className="h-4 w-4 text-base-content/35"
                aria-hidden
              />
            </div>
          </div>
        </Link>
        <Link
          href="/app/profile/saved"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-error/35 w-full"
        >
          <div className="card-body flex flex-row items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Heart
                className="h-5 w-5 shrink-0 fill-current text-error sm:h-6 sm:w-6"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-error">
                  Saved
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-2xl font-bold sm:text-3xl">{savedCount}</p>
              <ChevronRight
                className="h-4 w-4 text-base-content/35"
                aria-hidden
              />
            </div>
          </div>
        </Link>
      </div>

      <SignOutForm className="pt-4" />
    </div>
  );
}
