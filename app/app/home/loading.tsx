/**
 * Instant home shell while feed queries resolve (perceived faster navigation).
 * Location: app/app/home/loading.tsx
 */
export default function HomeLoading() {
  return (
    <div className="space-y-8 pt-2 animate-pulse">
      {[0, 1, 2].map((section) => (
        <section key={section} className="space-y-3">
          <div className="flex items-end justify-between gap-2 px-0.5">
            <div className="h-6 w-40 rounded-lg bg-base-300/60" />
            <div className="h-6 w-24 rounded-lg bg-base-300/45" />
          </div>
          <div className="-mx-4 flex gap-2 overflow-hidden px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[9.75rem] rounded-xl border border-base-300/50 bg-base-100 p-2"
              >
                <div className="aspect-[3/4] w-full rounded-md bg-base-300/50" />
                <div className="mt-2 h-3 w-full rounded bg-base-300/40" />
                <div className="mt-1 h-3 w-2/3 rounded bg-base-300/35" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
