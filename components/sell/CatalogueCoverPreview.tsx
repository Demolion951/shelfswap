"use client";

/**
 * Open Library catalogue cover via same-origin proxy + size fallbacks (reliable on mobile).
 * Location: components/sell/CatalogueCoverPreview.tsx
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { useEffect, useState } from "react";

type Props = {
  initialSrc: string;
  isbnDigits: string;
  className?: string;
};

function buildCandidates(initialSrc: string, isbnDigits: string): string[] {
  const out: string[] = [];
  const t = initialSrc.trim();
  if (t) {
    const proxied = coverImageSrcForDisplay(t) ?? t;
    out.push(proxied);
  }
  const b = isbnDigits.replace(/\D/g, "");
  if (b && (b.length === 10 || b.length === 13)) {
    for (const size of ["L", "M", "S"] as const) {
      const u = `/api/openlibrary-cover?isbn=${encodeURIComponent(b)}&size=${size}`;
      if (!out.includes(u)) out.push(u);
    }
  }
  return out;
}

export function CatalogueCoverPreview({ initialSrc, isbnDigits, className }: Props) {
  const [index, setIndex] = useState(0);
  const candidates = buildCandidates(initialSrc, isbnDigits);

  useEffect(() => {
    setIndex(0);
  }, [initialSrc]);

  const src = candidates[index];
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
