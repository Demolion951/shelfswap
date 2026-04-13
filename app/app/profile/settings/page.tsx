import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * App settings entry from the header gear (placeholders until preferences ship).
 * Location: app/app/profile/settings/page.tsx
 */
export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6 pt-2">
      <Link href="/app/profile" className="btn btn-ghost btn-sm gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profile
      </Link>

      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Settings</h1>
        <p className="mt-2 text-sm text-base-content/65">
          Account preferences and more will appear here soon.
        </p>
      </div>
    </div>
  );
}
