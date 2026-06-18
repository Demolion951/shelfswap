"use client";

/**
 * Activity bell — opens feed; badge clears only when notifications are marked read.
 * Location: components/nav/ActivityBellButton.tsx
 */
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import { Bell } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function ActivityBellButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { counts } = useBadgeCounts();
  const activityActive = pathname.startsWith("/app/activity");

  const localUnread = counts.unreadNotifications;
  const badge =
    localUnread > 9 ? "9+" : localUnread > 0 ? String(localUnread) : null;

  return (
    <button
      type="button"
      onClick={() => router.push("/app/activity")}
      className={`btn btn-ghost btn-circle btn-sm indicator ${
        activityActive ? "text-primary" : "text-base-content/55 hover:text-base-content"
      }`}
      aria-label={
        localUnread > 0
          ? `Activity, ${localUnread} unread notification${localUnread === 1 ? "" : "s"}`
          : "Activity"
      }
    >
      {badge ? (
        <span className="indicator-item badge badge-primary badge-xs min-h-[1rem] min-w-[1rem] px-0.5 py-0 text-[0.65rem] leading-none">
          {badge}
        </span>
      ) : null}
      <Bell className="h-5 w-5" strokeWidth={activityActive ? 2.25 : 1.75} aria-hidden />
    </button>
  );
}
