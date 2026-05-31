/**
 * Instant shell while listing detail data resolves (reduces perceived wait on navigation).
 * Location: app/app/listings/[id]/loading.tsx
 */
export default function ListingDetailLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8 px-1 pt-2 animate-pulse">
      <div className="flex gap-2">
        <div className="h-56 flex-1 rounded-xl bg-base-300/50" />
      </div>
      <div className="h-8 w-3/4 rounded-lg bg-base-300/60" />
      <div className="h-4 w-full rounded bg-base-300/40" />
      <div className="h-4 w-5/6 rounded bg-base-300/35" />
      <div className="card bg-base-200/40 border border-base-300/50 mt-4">
        <div className="card-body gap-3 py-6">
          <div className="h-5 w-28 rounded bg-base-300/55" />
          <div className="h-24 rounded-lg bg-base-300/35" />
        </div>
      </div>
    </div>
  );
}
