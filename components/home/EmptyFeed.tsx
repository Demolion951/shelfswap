import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

/**
 * Friendly empty state when no listings exist yet.
 * Location: components/home/EmptyFeed.tsx
 */
export function EmptyFeed() {
  return (
    <div className="card bg-base-100 border border-base-300/80 shadow-sm">
      <div className="card-body items-center text-center gap-4 py-10">
        <div className="rounded-full bg-primary/10 p-4 text-primary">
          <BookOpen className="h-10 w-10" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 className="shelfswap-heading text-xl font-semibold">Your shelf is waiting</h2>
          <p className="text-sm text-base-content/65 max-w-xs mx-auto">
            Be the first to list a book nearby, or invite a friend. Browsing is always free.
          </p>
        </div>
        <Link href="/app/sell" className="btn btn-primary gap-2">
          <Plus className="h-5 w-5" aria-hidden />
          List a book
        </Link>
      </div>
    </div>
  );
}
