"use client";

/**
 * Branded top bar for the authenticated app shell; Activity opens from the bell (not bottom nav).
 * Location: components/nav/AppTopBar.tsx
 */
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppTopBar() {
  const pathname = usePathname();
  const activityActive = pathname.startsWith("/app/activity");

  return (
    <header className="sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/app/home" className="shelfswap-heading text-lg font-semibold text-primary">
          ShelfSwap
        </Link>
        <Link
          href="/app/activity"
          prefetch={true}
          className={`btn btn-ghost btn-circle btn-sm -mr-1 ${
            activityActive ? "text-primary" : "text-base-content/55 hover:text-base-content"
          }`}
          aria-label="Activity"
        >
          <Bell className="h-5 w-5" strokeWidth={activityActive ? 2.25 : 1.75} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
