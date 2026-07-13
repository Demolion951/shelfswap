/**
 * Small karma tier badge for profiles and buyer conversation chips.
 * Location: components/profile/ProfileKarmaBadge.tsx
 */
import {
  formatExchangeCount,
  karmaTierFromExchanges,
  karmaTierLabel,
  totalExchanges,
  type KarmaStats,
} from "@/lib/profile/karma";

type Props = {
  stats: KarmaStats;
  /** Show "· N exchanges" after the tier label. */
  showCount?: boolean;
  size?: "xs" | "sm";
};

export function ProfileKarmaBadge({ stats, showCount = false, size = "xs" }: Props) {
  const exchanges = totalExchanges(stats);
  const tier = karmaTierFromExchanges(exchanges);
  const label = karmaTierLabel(tier);

  const tierClass =
    tier === "trusted"
      ? "border-primary/30 text-primary"
      : tier === "reliable"
        ? "border-secondary/30 text-secondary"
        : tier === "active"
          ? "border-success/25 text-success"
          : "border-base-300/80 text-base-content/55";

  return (
    <span
      className={`badge badge-ghost ${size === "sm" ? "badge-sm" : "badge-xs"} ${tierClass}`}
      title={showCount ? undefined : formatExchangeCount(exchanges)}
    >
      {label}
      {showCount && exchanges > 0 ? ` · ${formatExchangeCount(exchanges)}` : null}
    </span>
  );
}
