"use client";

/**
 * Navigates to a listing/activity target and marks one notification read (bell badge sync).
 * Location: components/activity/MarkNotificationReadLink.tsx
 */
import { markNotificationReadAction } from "@/app/app/notifications/actions";
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import Link from "next/link";

type Props = {
  notificationId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  wasUnread?: boolean;
};

export function MarkNotificationReadLink({
  notificationId,
  href,
  className,
  children,
  wasUnread = true,
}: Props) {
  const { setCounts } = useBadgeCounts();

  return (
    <Link
      href={href}
      prefetch
      className={className}
      onClick={() => {
        if (!wasUnread) return;
        void markNotificationReadAction(notificationId).then((res) => {
          if (res.ok) setCounts(res.counts);
        });
      }}
    >
      {children}
    </Link>
  );
}
