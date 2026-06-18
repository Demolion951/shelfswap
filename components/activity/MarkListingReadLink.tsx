"use client";

/**
 * Listing link that clears unread message alerts for that thread (Messages + bell badges).
 * Location: components/activity/MarkListingReadLink.tsx
 */
import { markListingMessageNotificationsReadAction } from "@/app/app/notifications/actions";
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import Link from "next/link";

type Props = {
  listingId: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  /** When true, clears message notifications for this listing on tap. */
  clearMessageAlerts?: boolean;
};

export function MarkListingReadLink({
  listingId,
  href,
  className,
  children,
  clearMessageAlerts = false,
}: Props) {
  const { setCounts } = useBadgeCounts();

  return (
    <Link
      href={href}
      prefetch
      className={className}
      onClick={() => {
        if (!clearMessageAlerts) return;
        void markListingMessageNotificationsReadAction(listingId).then((res) => {
          if (res.ok) setCounts(res.counts);
        });
      }}
    >
      {children}
    </Link>
  );
}
