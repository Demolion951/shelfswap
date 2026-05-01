"use client";

/**
 * Branded top bar: notifications (bell) on the right; settings live under Profile → App settings.
 * Activity bell marks notifications read when tapped, then opens the feed; badge uses server count.
 * Location: components/nav/AppTopBar.tsx
 */
import { shelfswapLogoSrc } from "@/lib/brand/logo";
import { ActivityBellButton } from "@/components/nav/ActivityBellButton";
import Image from "next/image";
import Link from "next/link";

type Props = {
  unreadCount: number;
};

export function AppTopBar({ unreadCount }: Props) {
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
            className="h-8 w-auto max-w-[min(100%,21rem)] sm:h-9 sm:max-w-none"
          />
        </Link>
        <div className="relative flex items-center justify-end pr-0.5">
          <span className="relative shrink-0">
            <ActivityBellButton unreadCount={unreadCount} />
          </span>
        </div>
      </div>
    </header>
  );
}
