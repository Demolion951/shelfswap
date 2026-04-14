import { SignOutForm } from "@/components/auth/SignOutForm";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import { SettingsRow } from "@/components/SettingsRow";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Bell,
  BookMarked,
  CreditCard,
  Heart,
  KeyRound,
  MessageCircle,
  Settings2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * App settings entry from the header gear (placeholders until preferences ship).
 * Location: app/app/profile/settings/page.tsx
 */
export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (authError || !user) {
    redirect("/auth/sign-in?next=%2Fapp%2Fprofile%2Fsettings");
  }

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Settings2 className="h-7 w-7 shrink-0" aria-hidden />
          <h1 className="shelfswap-heading text-2xl font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-base-content/65">Photo, shortcuts, and account options.</p>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-4 gap-4">
          <div className="flex items-center gap-2 text-primary">
            <UserRound className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Account</span>
          </div>
          <ProfileAvatarUploader
            initialAvatarUrl={(profile?.avatar_url as string | null) ?? null}
            accountLabel={profile?.display_name?.trim() || user.email || "Reader"}
          />
          <div className="border-t border-base-300/60 pt-3 space-y-1">
            <p className="text-sm font-medium text-base-content">
              {profile?.display_name?.trim() || "Reader"}
            </p>
            <p className="text-xs text-base-content/50 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-0">
          <ul className="divide-y divide-base-300/60">
            <SettingsRow
              href="/app/credits"
              Icon={CreditCard}
              title="Wallet"
              description="View credits and purchase history"
            />
            <SettingsRow
              href="/app/profile/listings"
              Icon={BookMarked}
              title="Your listings"
              description="Manage your shelf"
            />
            <SettingsRow
              href="/app/profile/saved"
              Icon={Heart}
              title="Saved"
              description="Listings you have bookmarked"
            />
            <SettingsRow
              href="/app/messages"
              Icon={MessageCircle}
              title="Messages"
              description="Chats with unlocked listings"
            />
            <SettingsRow
              href="/app/activity"
              Icon={Bell}
              title="Activity"
              description="Notifications and recent events"
            />
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-0">
          <ul className="divide-y divide-base-300/60">
            <SettingsRow
              href="/auth/forgot-password"
              Icon={KeyRound}
              title="Change password"
              description="Send a reset link to your email"
            />
          </ul>
        </div>
      </div>

      <SignOutForm className="pt-2" />
    </div>
  );
}
