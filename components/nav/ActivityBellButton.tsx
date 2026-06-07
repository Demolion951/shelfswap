"use client";

/**
 * Activity bell: navigate immediately; mark read in background (no full-page refresh).
 * Location: components/nav/ActivityBellButton.tsx
 */
import { markAllNotificationsReadAction } from "@/app/app/notifications/actions";
import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  unreadCount: number;
};

export function ActivityBellButton({ unreadCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const activityActive = pathname.startsWith("/app/activity");
  const [localUnread, setLocalUnread] = useState(unreadCount);

  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  const badge =
    localUnread > 9 ? "9+" : localUnread > 0 ? String(localUnread) : null;

  function onNavigate() {
    if (localUnread > 0) {
      setLocalUnread(0);
      void markAllNotificationsReadAction();
    }
    router.push("/app/activity");
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate()}
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
