"use client";

/**
 * Branded top bar for the authenticated app shell; Activity opens from the bell (not bottom nav).
 * Shows unread notification count from server (conversation started, etc.).
 * Location: components/nav/AppTopBar.tsx
 */
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  unreadCount: number;
};

export function AppTopBar({ unreadCount }: Props) {
  const pathname = usePathname();
  const activityActive = pathname.startsWith("/app/activity");
  const badge =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/app/home" className="shelfswap-heading text-lg font-semibold text-primary">
          ShelfSwap
        </Link>
        <Link
          href="/app/activity"
          prefetch={true}
          className={`btn btn-ghost btn-circle btn-sm indicator -mr-1 ${
            activityActive ? "text-primary" : "text-base-content/55 hover:text-base-content"
          }`}
          aria-label={
            unreadCount > 0
              ? `Activity, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "Activity"
          }
        >
          {badge ? (
            <span className="indicator-item badge badge-primary badge-sm min-w-[1.25rem] px-1">
              {badge}
            </span>
          ) : null}
          <Bell className="h-5 w-5" strokeWidth={activityActive ? 2.25 : 1.75} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
