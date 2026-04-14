"use client";

/**
 * Branded top bar: Settings (gear) and Activity (bell) on the right; bottom nav for primary tabs.
 * Activity bell marks notifications read when tapped, then opens the feed; badge uses server count.
 * Location: components/nav/AppTopBar.tsx
 */
import { ActivityBellButton } from "@/components/nav/ActivityBellButton";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  unreadCount: number;
};

export function AppTopBar({ unreadCount }: Props) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/app/profile/settings");
  return (
    <header className="sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/app/home" className="shelfswap-heading text-lg font-semibold text-primary">
          ShelfSwap
        </Link>
        <div className="relative flex items-center gap-2 pr-0.5">
          <Link
            href="/app/profile/settings"
            prefetch={true}
            className={`relative z-[25] btn btn-ghost btn-circle btn-sm shrink-0 ${
              settingsActive ? "text-primary" : "text-base-content/55 hover:text-base-content"
            }`}
            aria-label="Settings"
          >
            <Settings2 className="h-5 w-5" strokeWidth={settingsActive ? 2.25 : 1.75} aria-hidden />
          </Link>
          <span className="relative z-[24] shrink-0">
            <ActivityBellButton unreadCount={unreadCount} />
          </span>
        </div>
      </div>
    </header>
  );
}
