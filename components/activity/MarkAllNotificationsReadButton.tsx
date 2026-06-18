"use client";

/**
 * Clears all unread notifications (Activity page header action).
 * Location: components/activity/MarkAllNotificationsReadButton.tsx
 */
import { markAllNotificationsReadAction } from "@/app/app/notifications/actions";
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  hasUnread: boolean;
};

export function MarkAllNotificationsReadButton({ hasUnread }: Props) {
  const { setCounts } = useBadgeCounts();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!hasUnread) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm h-8 min-h-0 text-xs normal-case"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void markAllNotificationsReadAction().then((res) => {
          setPending(false);
          if (res.ok) {
            setCounts(res.counts);
            router.refresh();
          }
        });
      }}
    >
      Mark all as read
    </button>
  );
}
