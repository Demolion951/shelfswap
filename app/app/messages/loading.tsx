import { ListPageSkeleton } from "@/components/ui/ListPageSkeleton";

/**
 * Instant messages shell while inbox threads load.
 * Location: app/app/messages/loading.tsx
 */
export default function MessagesLoading() {
  return <ListPageSkeleton rows={5} />;
}
