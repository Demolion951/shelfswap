import type { ReactNode } from "react";

/**
 * Home feed block with title, optional action, and horizontal scroll content.
 * Location: components/home/FeedSection.tsx
 */
type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function FeedSection({ title, subtitle, action, children }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="shelfswap-heading text-lg font-semibold text-base-content">
            {title}
          </h2>
          {/* Subtitle intentionally hidden for a cleaner feed. */}
        </div>
        {action}
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-thin snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}
