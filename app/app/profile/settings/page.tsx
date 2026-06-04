import { SignOutForm } from "@/components/auth/SignOutForm";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import { ProfileLocationSettings } from "@/components/profile/ProfileLocationSettings";
import { SettingsRow } from "@/components/SettingsRow";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  FileText,
  KeyRound,
  ListOrdered,
  Mail,
  Scale,
  Settings2,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * App settings: account, change password, help & legal. Opened from Profile → App settings.
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
        .select("display_name, avatar_url, home_approx_area_text, approx_area_text")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const homeAreaLabel =
    (profile?.home_approx_area_text as string | null)?.trim() || null;
  const browseAreaLabel = (profile?.approx_area_text as string | null)?.trim() || null;

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="flex items-center gap-2 text-primary">
        <Settings2 className="h-7 w-7 shrink-0" aria-hidden />
        <h1 className="shelfswap-heading text-2xl font-semibold">Settings</h1>
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
          <div className="border-t border-base-300/60 pt-3 space-y-0.5">
            <p className="text-sm font-medium text-base-content">
              {profile?.display_name?.trim() || "Reader"}
            </p>
            <p className="text-xs text-base-content/50 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-4">
          <ProfileLocationSettings
            homeAreaLabel={homeAreaLabel}
            browseAreaLabel={browseAreaLabel}
          />
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-0">
          <ul className="divide-y divide-base-300/60">
            <SettingsRow href="/auth/forgot-password" Icon={KeyRound} title="Change password" />
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-4 pb-2">
          <div className="flex items-center gap-2 text-primary">
            <Scale className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wide">Help & legal</span>
          </div>
        </div>
        <div className="card-body p-0 pt-0">
          <ul className="divide-y divide-base-300/60">
            <SettingsRow href="/faq" Icon={ListOrdered} title="FAQ" />
            <SettingsRow href="/contact" Icon={Mail} title="Contact" />
            <SettingsRow href="/terms" Icon={FileText} title="Terms of service" />
            <SettingsRow href="/privacy" Icon={Shield} title="Privacy policy" />
          </ul>
        </div>
      </div>

      <SignOutForm className="pt-2" />
    </div>
  );
}
