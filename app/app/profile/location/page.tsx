import { ProfileLocationSettings } from "@/components/profile/ProfileLocationSettings";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

/**
 * Home area for listings (postcode or device). Opened from Profile → Location.
 * Location: app/app/profile/location/page.tsx
 */
export default async function ProfileLocationPage() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (authError || !user) {
    redirect("/auth/sign-in?next=%2Fapp%2Fprofile%2Flocation");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_approx_area_text")
    .eq("id", user.id)
    .maybeSingle();

  const homeAreaLabel =
    (profile?.home_approx_area_text as string | null)?.trim() || null;

  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div className="flex items-center gap-2 text-primary">
        <MapPin className="h-6 w-6 shrink-0" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Location</h1>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body p-4">
          <ProfileLocationSettings homeAreaLabel={homeAreaLabel} showSectionHeader={false} />
        </div>
      </div>
    </div>
  );
}
