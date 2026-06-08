import { ListPageSkeleton } from "@/components/ui/ListPageSkeleton";

/**
 * Instant profile shell while dashboard counts load.
 * Location: app/app/profile/loading.tsx
 */
export default function ProfileLoading() {
  return (
    <div className="space-y-6 pt-2 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-base-300/60" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <div className="h-7 w-40 rounded-lg bg-base-300/55" />
          <div className="h-3 w-48 rounded bg-base-300/40" />
        </div>
      </div>
      <ListPageSkeleton rows={4} />
    </div>
  );
}
