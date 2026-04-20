"use client";

/**
 * Branded top bar: Settings (gear) and Activity (bell) on the right; bottom nav for primary tabs.
 * Activity bell marks notifications read when tapped, then opens the feed; badge uses server count.
 * Location: components/nav/AppTopBar.tsx
 */
import { shelfswapLogoSrc } from "@/lib/brand/logo";
import { ActivityBellButton } from "@/components/nav/ActivityBellButton";
import { Settings } from "lucide-react";
import Image from "next/image";
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
        <Link href="/app/home" className="flex min-w-0 items-center py-1" aria-label="ShelfSwap home">
          <Image
            src={shelfswapLogoSrc()}
            alt=""
            width={857}
            height={220}
            priority
            unoptimized
            className="h-[1.35rem] w-auto max-w-[13.5rem] sm:h-6 sm:max-w-none"
          />
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
            <Settings className="h-5 w-5" strokeWidth={settingsActive ? 2.25 : 1.75} aria-hidden />
          </Link>
          <span className="relative z-[24] shrink-0">
            <ActivityBellButton unreadCount={unreadCount} />
          </span>
        </div>
      </div>
    </header>
  );
}
