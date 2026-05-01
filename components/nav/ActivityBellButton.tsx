"use client";

/**
 * Activity entry in the header: marks all notifications read on tap so the badge clears immediately,
 * then navigates to the activity feed.
 * Location: components/nav/ActivityBellButton.tsx
 */
import { markAllNotificationsReadAction } from "@/app/app/notifications/actions";
import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  unreadCount: number;
};

export function ActivityBellButton({ unreadCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const activityActive = pathname.startsWith("/app/activity");
  const badge =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;
  const [busy, setBusy] = useState(false);

  async function onNavigate() {
    if (unreadCount > 0) {
      setBusy(true);
      try {
        await markAllNotificationsReadAction();
        router.refresh();
      } finally {
        setBusy(false);
      }
    }
    router.push("/app/activity");
  }

  return (
    <button
      type="button"
      onClick={() => void onNavigate()}
      disabled={busy}
      className={`btn btn-ghost btn-circle btn-sm indicator ${
        activityActive ? "text-primary" : "text-base-content/55 hover:text-base-content"
      }`}
      aria-label={
        unreadCount > 0
          ? `Activity, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
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
