"use client";

/**
 * Shared unread badge counts for bell + Messages tab — updated optimistically when items are read.
 * Location: components/nav/BadgeCountsProvider.tsx
 */
import type { BadgeCounts } from "@/lib/notifications/queries";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type BadgeCountsContextValue = {
  counts: BadgeCounts;
  setCounts: (counts: BadgeCounts) => void;
};

const BadgeCountsContext = createContext<BadgeCountsContextValue | null>(null);

type Props = {
  initialCounts: BadgeCounts;
  children: React.ReactNode;
};

export function BadgeCountsProvider({ initialCounts, children }: Props) {
  const [counts, setCountsState] = useState(initialCounts);

  useEffect(() => {
    setCountsState(initialCounts);
  }, [initialCounts.unreadNotifications, initialCounts.unreadMessages]);

  const setCounts = useCallback((next: BadgeCounts) => {
    setCountsState({
      unreadNotifications: Math.max(0, next.unreadNotifications),
      unreadMessages: Math.max(0, next.unreadMessages),
    });
  }, []);

  const value = useMemo(() => ({ counts, setCounts }), [counts, setCounts]);

  return <BadgeCountsContext.Provider value={value}>{children}</BadgeCountsContext.Provider>;
}

export function useBadgeCounts(): BadgeCountsContextValue {
  const ctx = useContext(BadgeCountsContext);
  if (!ctx) {
    throw new Error("useBadgeCounts must be used within BadgeCountsProvider");
  }
  return ctx;
}
