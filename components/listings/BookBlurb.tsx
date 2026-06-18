"use client";

/**
 * Displays catalogue synopsis on listing detail — or a clear message when none exists.
 * Location: components/listings/BookBlurb.tsx
 */
type Props = {
  text: string;
  source?: "open_library" | "google_books";
  sourceUrl?: string | null;
};

const SOURCE_LABELS: Record<NonNullable<Props["source"]>, string> = {
  open_library: "Open Library",
  google_books: "Google Books",
};

export function BookBlurb({ text, source, sourceUrl }: Props) {
  const sourceLabel = source ? SOURCE_LABELS[source] : null;

  return (
    <section className="space-y-2" aria-labelledby="listing-book-blurb-heading">
      <h2
        id="listing-book-blurb-heading"
        className="shelfswap-heading text-sm font-semibold text-secondary"
      >
        About this book
      </h2>
      <div className="rounded-xl border border-base-300/80 bg-base-100 p-4 text-sm leading-relaxed text-base-content max-w-none">
        <p className="whitespace-pre-wrap break-words">{text}</p>
        {sourceLabel ? (
          <p className="mt-3 text-[11px] text-base-content/50">
            Source:{" "}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                className="link link-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                {sourceLabel}
              </a>
            ) : (
              sourceLabel
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function BookBlurbUnavailable() {
  return (
    <section className="space-y-2" aria-labelledby="listing-book-blurb-heading">
      <h2
        id="listing-book-blurb-heading"
        className="shelfswap-heading text-sm font-semibold text-secondary"
      >
        About this book
      </h2>
      <div className="rounded-xl border border-base-300/80 bg-base-200/40 p-4 text-sm leading-relaxed text-base-content/65">
        No synopsis is available for this book in our catalogue sources. Check the seller&apos;s
        notes above, or look up the title online for more detail.
      </div>
    </section>
  );
}
