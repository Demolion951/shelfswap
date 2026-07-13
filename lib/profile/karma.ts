/**
 * Karma / reliability tiers from completed handoffs (pickups, sales, swaps).
 * Location: lib/profile/karma.ts
 */

export type KarmaStats = {
  completedPickups: number;
  completedSales: number;
  completedSwaps: number;
};

export type KarmaTier = "new" | "active" | "reliable" | "trusted";

export const KARMA_TIER_THRESHOLDS = {
  active: 1,
  reliable: 5,
  trusted: 15,
} as const;

export function totalExchanges(stats: KarmaStats): number {
  return stats.completedPickups + stats.completedSales + stats.completedSwaps;
}

export function karmaTierFromExchanges(exchangeCount: number): KarmaTier {
  if (exchangeCount >= KARMA_TIER_THRESHOLDS.trusted) return "trusted";
  if (exchangeCount >= KARMA_TIER_THRESHOLDS.reliable) return "reliable";
  if (exchangeCount >= KARMA_TIER_THRESHOLDS.active) return "active";
  return "new";
}

export function karmaTierLabel(tier: KarmaTier): string {
  switch (tier) {
    case "trusted":
      return "Trusted";
    case "reliable":
      return "Reliable";
    case "active":
      return "Active";
    default:
      return "New member";
  }
}

/** Higher = more trusted; used for buyer-picker tiebreakers only. */
export function karmaTierSortWeight(tier: KarmaTier): number {
  switch (tier) {
    case "trusted":
      return 4;
    case "reliable":
      return 3;
    case "active":
      return 2;
    default:
      return 1;
  }
}

export function karmaStatsFromPublicProfile(row: Record<string, unknown> | null | undefined): KarmaStats {
  return {
    completedPickups: Number(row?.completed_pickups_count ?? 0) || 0,
    completedSales: Number(row?.completed_sales_count ?? 0) || 0,
    completedSwaps: Number(row?.completed_swaps_count ?? 0) || 0,
  };
}

export function formatExchangeCount(count: number): string {
  return `${count} exchange${count === 1 ? "" : "s"}`;
}
