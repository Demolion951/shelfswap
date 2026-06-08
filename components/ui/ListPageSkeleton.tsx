/**
 * Shared pulse skeleton for list-style app pages (activity, messages, profile).
 * Location: components/ui/ListPageSkeleton.tsx
 */
export function ListPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 pt-2 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-base-300/60" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl border border-base-300/50 bg-base-100 p-3"
          >
            <div className="h-16 w-12 shrink-0 rounded-md bg-base-300/50" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
              <div className="h-3 w-3/4 rounded bg-base-300/45" />
              <div className="h-3 w-1/2 rounded bg-base-300/35" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
