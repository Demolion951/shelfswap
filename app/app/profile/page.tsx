import { SignOutForm } from "@/components/auth/SignOutForm";
import { SettingsRow } from "@/components/SettingsRow";
import {
  fetchMyListings,
  fetchMyRehomedListings,
  getSavedListingsCount,
} from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight, Coins, Heart, Home, Library, Settings2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) {
    redirect("/auth/sign-in?next=%2Fapp%2Fprofile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, credit_balance")
    .eq("id", user.id)
    .maybeSingle();

  const [myListings, rehomedListings, savedCount] = await Promise.all([
    fetchMyListings(user.id),
    fetchMyRehomedListings(user.id),
    getSavedListingsCount(user.id),
  ]);
  const rehomedCount = rehomedListings.pickups.length + rehomedListings.swaps.length;

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
          href="/app/credits"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/35 w-full"
        >
          <div className="card-body flex flex-row items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <Coins
                className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Wallet
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {typeof profile?.credit_balance === "number"
                  ? profile.credit_balance
                  : Number(profile?.credit_balance ?? 0) || 0}
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
              <p className="text-2xl font-bold sm:text-3xl">{myListings.length}</p>
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
                <p className="text-[10px] text-base-content/45 leading-tight">
                  Passed on &amp; swaps
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
