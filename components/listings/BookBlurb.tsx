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
    <div className="rounded-xl bg-base-100 border border-base-300/80 p-4 text-sm leading-relaxed">
      <p className="whitespace-pre-wrap">{text}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-base-content/50">
        <span>Source: Open Library</span>
        <Link href={sourceUrl} className="link link-primary" target="_blank" rel="noreferrer">
          View source
        </Link>
      </div>
    </div>
  );
}

