"use client";

/**
 * Open Library catalogue cover with HTTPS-friendly fallbacks and no-referrer (mobile hotlink).
 * Cycles L → M → S ISBN covers if the primary URL fails to load.
 * Location: components/sell/CatalogueCoverPreview.tsx
 */
import { useEffect, useState } from "react";

type Props = {
  initialSrc: string;
  isbnDigits: string;
  className?: string;
};

function buildCandidates(initialSrc: string, isbnDigits: string): string[] {
  const out: string[] = [];
  const t = initialSrc.trim();
  if (t) out.push(t);
  const b = isbnDigits.replace(/\D/g, "");
  if (b) {
    for (const size of ["L", "M", "S"] as const) {
      const u = `https://covers.openlibrary.org/b/isbn/${b}-${size}.jpg`;
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
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
