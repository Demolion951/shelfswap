import Link from "next/link";

/**
 * Branded top bar for the authenticated app area.
 * Location: components/nav/AppTopBar.tsx
 */
export function AppTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
        <Link href="/app/home" className="shelfswap-heading text-lg font-semibold text-primary">
          ShelfSwap
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-base-content/40">
          Local books
        </span>
      </div>
    </header>
  );
}
