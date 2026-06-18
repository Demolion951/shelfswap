"use client";

/**
 * Loads catalogue synopsis after paint — always shows the section (text or fallback).
 * Location: components/listings/OpenLibraryBlurbLoader.tsx
 */
import { BookBlurb, BookBlurbUnavailable } from "@/components/listings/BookBlurb";
import { useEffect, useState } from "react";

type Props = {
  isbn: string | null;
  title: string;
  author?: string | null;
};

type BlurbPayload = {
  found: boolean;
  text?: string;
  source?: "open_library" | "google_books";
  sourceUrl?: string | null;
};

export function OpenLibraryBlurbLoader({ isbn, title, author }: Props) {
  const [blurb, setBlurb] = useState<BlurbPayload | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const digits = isbn?.replace(/\D/g, "") ?? "";
    const hasIsbn = digits.length === 10 || digits.length === 13;
    const hasTitle = Boolean(title.trim());
    if (!hasIsbn && !hasTitle) {
      setBlurb({ found: false });
      setPhase("done");
      return;
    }

    let cancelled = false;
    setPhase("loading");
    setBlurb(null);

    const q = new URLSearchParams();
    if (hasIsbn) q.set("isbn", isbn!);
    if (title.trim()) q.set("title", title.trim());
    if (author?.trim()) q.set("author", author.trim());

    fetch(`/api/openlibrary-blurb?${q.toString()}`)
      .then(async (res) => {
        if (res.ok) return (await res.json()) as BlurbPayload;
        return { found: false } as BlurbPayload;
      })
      .then((data) => {
        if (cancelled) return;
        setBlurb(data);
        setPhase("done");
      })
      .catch(() => {
        if (!cancelled) {
          setBlurb({ found: false });
          setPhase("done");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isbn, title, author]);

  if (phase === "loading") {
    return (
      <section className="space-y-2" aria-busy="true" aria-label="Loading book description">
        <div className="shelfswap-heading h-4 w-40 animate-pulse rounded bg-base-300/80" />
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

  return <BookBlurbUnavailable />;
}
