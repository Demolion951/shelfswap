import { signOut } from "@/app/auth/actions";
import { SettingsRow } from "@/components/SettingsRow";
import { fetchMyListings, getSavedListingsCount } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";
import { Coins, Heart, Library, LogOut, Settings2 } from "lucide-react";
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

  const myListings = await fetchMyListings(user.id);
  const savedCount = await getSavedListingsCount(user.id);

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
          <p className="text-xs text-base-content/50 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <ul className="divide-y divide-base-300/60">
          <SettingsRow
            href="/app/profile/settings"
            Icon={Settings2}
            title="App settings"
            description="Profile photo, password link, and shortcuts"
          />
        </ul>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Link
          href="/app/credits"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/35"
        >
          <div className="card-body p-3 sm:p-4 gap-1">
            <div className="flex items-center gap-1.5 text-primary">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide leading-tight">
                Wallet
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">
              {typeof profile?.credit_balance === "number"
                ? profile.credit_balance
                : Number(profile?.credit_balance ?? 0) || 0}
            </p>
            <p className="text-[9px] sm:text-[10px] text-base-content/50 leading-snug">Credits</p>
          </div>
        </Link>
        <Link
          href="/app/profile/listings"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-secondary/35"
        >
          <div className="card-body p-3 sm:p-4 gap-1">
            <div className="flex items-center gap-1.5 text-secondary">
              <Library className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide leading-tight">
                Listings
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{myListings.length}</p>
            <p className="text-[9px] sm:text-[10px] text-base-content/50 leading-snug">Yours</p>
          </div>
        </Link>
        <Link
          href="/app/profile/saved"
          className="card bg-base-100 border border-base-300/80 shadow-sm transition hover:border-error/35"
        >
          <div className="card-body p-3 sm:p-4 gap-1">
            <div className="flex items-center gap-1.5 text-error">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 fill-current" aria-hidden />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide leading-tight">
                Saved
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{savedCount}</p>
            <p className="text-[9px] sm:text-[10px] text-base-content/50 leading-snug">Bookmarks</p>
          </div>
        </Link>
      </div>

      <form action={signOut} className="pt-4">
        <button type="submit" className="btn btn-ghost btn-block gap-2 text-base-content/70">
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
