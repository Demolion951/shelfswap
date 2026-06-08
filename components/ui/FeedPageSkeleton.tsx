/**
 * Shared pulse skeleton for feed-style app pages (browse, search results).
 * Location: components/ui/FeedPageSkeleton.tsx
 */
export function FeedPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 pt-2 animate-pulse">
      <div className="h-8 w-36 rounded-lg bg-base-300/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-base-300/50 bg-base-100 p-2"
          >
            <div className="aspect-[3/4] w-full rounded-md bg-base-300/50" />
            <div className="mt-2 h-3 w-full rounded bg-base-300/40" />
            <div className="mt-1 h-3 w-2/3 rounded bg-base-300/35" />
          </div>
        ))}
      </div>
    </div>
  );
}
