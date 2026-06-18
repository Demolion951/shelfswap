"use client";

/**
 * Marks a single activity notification read and syncs header + Messages badges.
 * Location: components/activity/MarkNotificationReadButton.tsx
 */
import { markNotificationReadAction } from "@/app/app/notifications/actions";
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  notificationId: string;
  wasUnread: boolean;
};

export function MarkNotificationReadButton({ notificationId, wasUnread }: Props) {
  const { setCounts } = useBadgeCounts();
  const router = useRouter();
  const [read, setRead] = useState(!wasUnread);
  const [pending, setPending] = useState(false);

  if (read) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs h-7 min-h-0 px-2 text-[11px] normal-case"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void markNotificationReadAction(notificationId).then((res) => {
          setPending(false);
          if (res.ok) {
            setRead(true);
            setCounts(res.counts);
            router.refresh();
          }
        });
      }}
    >
      Mark as read
    </button>
  );
}
