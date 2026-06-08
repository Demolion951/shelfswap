import { ListPageSkeleton } from "@/components/ui/ListPageSkeleton";

/**
 * Instant activity shell while feed queries resolve.
 * Location: app/app/activity/loading.tsx
 */
export default function ActivityLoading() {
  return <ListPageSkeleton rows={6} />;
}
