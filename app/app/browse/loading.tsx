import { FeedPageSkeleton } from "@/components/ui/FeedPageSkeleton";

/**
 * Instant browse shell while listings load.
 * Location: app/app/browse/loading.tsx
 */
export default function BrowseLoading() {
  return <FeedPageSkeleton rows={8} />;
}
