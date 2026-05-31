"use client";

/**
 * Branded top bar: logo left (vertically centred), activity bell on the right.
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
    <header className="sticky top-0 z-40 border-b border-base-300/70 bg-base-100/95 backdrop-blur-md supports-[backdrop-filter]:bg-base-100/80">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
        <Link
          href="/app/home"
          className="flex min-w-0 items-center"
          aria-label="ShelfSwap home"
        >
          <Image
            src={shelfswapLogoSrc()}
            alt=""
            width={635}
            height={382}
            priority
            unoptimized
            className="h-[2.375rem] w-auto max-w-[9rem] object-contain"
          />
        </Link>
        <div className="flex shrink-0 items-center">
          <ActivityBellButton unreadCount={unreadCount} />
        </div>
      </div>
    </header>
  );
}
