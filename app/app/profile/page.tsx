import { signOut } from "@/app/auth/actions";
import { ListingCard } from "@/components/listings/ListingCard";
import { ApproxLocationCard } from "@/components/profile/ApproxLocationCard";
import { fetchMyListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { Coins, Library, LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url, credit_balance")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const myListings = user ? await fetchMyListings(user.id) : [];

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-4">
        <div className="avatar placeholder shrink-0">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary">
            <span className="w-full text-center text-2xl font-serif leading-none select-none">
              {(profile?.display_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="shelfswap-heading text-2xl font-semibold truncate">
            {profile?.display_name ?? "Reader"}
          </h1>
          <p className="text-xs text-base-content/50 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/credits"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/35"
        >
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-primary">
              <Coins className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Wallet</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {typeof profile?.credit_balance === "number"
                ? profile.credit_balance
                : Number(profile?.credit_balance ?? 0) || 0}
            </p>
            <p className="text-[10px] text-base-content/50">Tap to buy credits (soon)</p>
          </div>
        </Link>
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body p-4 gap-1">
            <div className="flex items-center gap-2 text-secondary">
              <Library className="h-5 w-5" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide">Listings</span>
            </div>
            <p className="text-2xl font-bold">{myListings.length}</p>
            <p className="text-[10px] text-base-content/50">active on your shelf</p>
          </div>
        </div>
      </div>

      <ApproxLocationCard />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn btn-ghost justify-start gap-3 border border-base-300/60 bg-base-100"
          disabled
        >
          <Settings className="h-5 w-5 opacity-50" aria-hidden />
          Settings
          <span className="ml-auto text-[10px] uppercase text-base-content/40">Soon</span>
        </button>
        <Link
          href="/app/sell"
          className="btn btn-outline btn-primary justify-start gap-3 border-primary/30"
        >
          <Library className="h-5 w-5" aria-hidden />
          New listing
        </Link>
      </div>

      {myListings.length > 0 ? (
        <section className="space-y-3">
          <h2 className="shelfswap-heading text-lg font-semibold">Your listings</h2>
          <ul className="flex flex-col gap-3">
            {myListings.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} variant="row" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={signOut} className="pt-4">
        <button type="submit" className="btn btn-ghost btn-block gap-2 text-base-content/70">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
