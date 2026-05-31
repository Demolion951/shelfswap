"use client";

/**
 * Fetches Open Library “About this book” copy after paint so listing detail stays fast.
 * Location: components/listings/OpenLibraryBlurbLoader.tsx
 */
import { BookBlurb } from "@/components/listings/BookBlurb";
import { useEffect, useState } from "react";

type Props = {
  isbn: string | null;
};

export function OpenLibraryBlurbLoader({ isbn }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const digits = isbn?.replace(/\D/g, "") ?? "";
    if (digits.length !== 10 && digits.length !== 13) return;

    let cancelled = false;
    setPhase("loading");
    fetch(`/api/openlibrary-blurb?isbn=${encodeURIComponent(isbn!)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { text?: string } | null) => {
        if (cancelled || !data?.text) {
          if (!cancelled) setPhase("done");
          return;
        }
        setText(data.text);
        setPhase("done");
      })
      .catch(() => {
        if (!cancelled) setPhase("done");
      });

    return () => {
      cancelled = true;
    };
  }, [isbn]);

  if (!isbn) return null;

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

  if (!text) return null;

  return <BookBlurb text={text} />;
}
