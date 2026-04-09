"use client";

/**
 * Client search bar: updates ?q= on /app/search via router (soft nav).
 * Location: components/search/SearchBar.tsx
 */
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const initial = sp.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    return () => clearTimeout(t.current);
  }, []);

  function pushQuery(next: string) {
    const params = new URLSearchParams(sp.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    router.push(`/app/search?${params.toString()}`);
  }

  function onChange(v: string) {
    setQ(v);
    clearTimeout(t.current);
    t.current = setTimeout(() => pushQuery(v), 280);
  }

  return (
    <div className="join w-full shadow-sm">
      <span className="btn btn-square btn-ghost join-item border border-base-300 border-r-0 bg-base-100 pointer-events-none">
        <Search className="h-5 w-5 opacity-50" aria-hidden />
      </span>
      <input
        ref={inputRef}
        className="input input-bordered join-item flex-1 border-base-300 bg-base-100"
        placeholder="Title, author, ISBN…"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search listings"
      />
      {q ? (
        <button
          type="button"
          className="btn btn-square btn-ghost join-item border border-base-300 border-l-0 bg-base-100"
          onClick={() => {
            setQ("");
            pushQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
