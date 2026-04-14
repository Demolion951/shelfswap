"use client";

/**
 * Displays Open Library catalogue copy on the listing detail page (not seller-written).
 * Full synopsis text is shown (no truncation in the UI).
 * Location: components/listings/BookBlurb.tsx
 */
type Props = {
  text: string;
};

export function BookBlurb({ text }: Props) {
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
      <div className="rounded-xl border border-base-300/80 bg-base-100 p-4 text-sm leading-relaxed text-base-content max-w-none">
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <p className="mt-3 text-[11px] text-base-content/50">Source: Open Library</p>
      </div>
    </section>
  );
}

