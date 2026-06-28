"use client";

/**
 * Loads catalogue synopsis — uses server prefetch when available, then client fetch as backup.
 * Location: components/listings/OpenLibraryBlurbLoader.tsx
 */
import { BookBlurb, BookBlurbUnavailable } from "@/components/listings/BookBlurb";
import type { BookBlurb as BookBlurbData } from "@/lib/books/openLibraryBlurb";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  isbn: string | null;
  title: string;
  author?: string | null;
  initialBlurb?: BookBlurbData | null;
};

type BlurbPayload = {
  found: boolean;
  text?: string;
  source?: "open_library" | "google_books";
  sourceUrl?: string | null;
};

function toPayload(blurb: BookBlurbData): BlurbPayload {
  return {
    found: true,
    text: blurb.text,
    source: blurb.source,
    sourceUrl: blurb.sourceUrl,
  };
}

export function OpenLibraryBlurbLoader({ isbn, title, author, initialBlurb }: Props) {
  const canLookup = useMemo(() => {
    const digits = isbn?.replace(/\D/g, "") ?? "";
    const hasIsbn = digits.length === 10 || digits.length === 13;
    return hasIsbn || Boolean(title.trim());
  }, [isbn, title]);

  const [blurb, setBlurb] = useState<BlurbPayload | null>(() =>
    initialBlurb?.text ? toPayload(initialBlurb) : null,
  );
  const [phase, setPhase] = useState<"loading" | "done">(() =>
    initialBlurb?.text ? "done" : canLookup ? "loading" : "done",
  );

  const loadBlurb = useCallback(async () => {
    if (!canLookup) {
      setBlurb({ found: false });
      setPhase("done");
      return;
    }

    setPhase("loading");
    const digits = isbn?.replace(/\D/g, "") ?? "";
    const hasIsbn = digits.length === 10 || digits.length === 13;
    const q = new URLSearchParams();
    if (hasIsbn) q.set("isbn", isbn!);
    if (title.trim()) q.set("title", title.trim());
    if (author?.trim()) q.set("author", author.trim());

    try {
      const res = await fetch(`/api/openlibrary-blurb?${q.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as BlurbPayload;
        setBlurb(data);
      } else {
        setBlurb({ found: false });
      }
    } catch {
      setBlurb({ found: false });
    } finally {
      setPhase("done");
    }
  }, [canLookup, isbn, title, author]);

  useEffect(() => {
    if (initialBlurb?.text) {
      setBlurb(toPayload(initialBlurb));
      setPhase("done");
      return;
    }
    void loadBlurb();
  }, [initialBlurb, loadBlurb]);

  if (phase === "loading" && !blurb?.text) {
    return (
      <section className="space-y-2" aria-busy="true" aria-labelledby="listing-book-blurb-heading">
        <h2
          id="listing-book-blurb-heading"
          className="shelfswap-heading text-sm font-semibold text-secondary"
        >
          About this book
        </h2>
        <div className="rounded-xl border border-base-300/80 bg-base-200/40 p-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-base-300/70" />
          <div className="h-3 w-[92%] animate-pulse rounded bg-base-300/60" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-base-300/50" />
        </div>
      </section>
    );
  }

  if (blurb?.found && blurb.text) {
    return (
      <BookBlurb text={blurb.text} source={blurb.source} sourceUrl={blurb.sourceUrl ?? null} />
    );
  }

  return (
    <div className="space-y-2">
      <BookBlurbUnavailable />
      {canLookup ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 min-h-0 normal-case"
          onClick={() => void loadBlurb()}
        >
          Retry loading synopsis
        </button>
      ) : null}
    </div>
  );
}
