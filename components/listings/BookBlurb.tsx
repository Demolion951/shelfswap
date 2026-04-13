"use client";

/**
 * Displays a sourced book blurb (Open Library) on the listing detail page.
 * Location: components/listings/BookBlurb.tsx
 */
import Link from "next/link";

type Props = {
  text: string;
  sourceUrl: string;
};

export function BookBlurb({ text, sourceUrl }: Props) {
  return (
    <section
      className="space-y-2"
      aria-labelledby="listing-book-blurb-heading"
    >
      <h2
        id="listing-book-blurb-heading"
        className="shelfswap-heading text-sm font-semibold text-secondary"
      >
        About this book
      </h2>
      <div className="rounded-xl border border-dashed border-secondary/35 bg-base-200/40 p-4 text-sm leading-relaxed text-base-content/90">
        <p className="whitespace-pre-wrap">{text}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-base-300/50 pt-3 text-[11px] text-base-content/50">
          <span>Open Library catalogue — not from the seller</span>
          <Link href={sourceUrl} className="link link-primary shrink-0" target="_blank" rel="noreferrer">
            View source
          </Link>
        </div>
      </div>
    </section>
  );
}

