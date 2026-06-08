import { FeedPageSkeleton } from "@/components/ui/FeedPageSkeleton";

/**
 * Instant search shell while results load.
 * Location: app/app/search/loading.tsx
 */
export default function SearchLoading() {
  return (
    <div className="space-y-5 pt-2 animate-pulse">
      <div className="h-8 w-28 rounded-lg bg-base-300/60" />
      <div className="h-12 w-full rounded-lg bg-base-300/50" />
      <FeedPageSkeleton rows={4} />
    </div>
  );
}
