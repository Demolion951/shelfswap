"use client";

/**
 * Pick one of the buyer's listings to offer in a swap — full titles wrap (no native select clipping).
 * Location: components/listings/SwapOfferPicker.tsx
 */
type OfferOption = { id: string; title: string };

type Props = {
  options: OfferOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function SwapOfferPicker({ options, value, onChange, disabled = false }: Props) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-base-content/60 rounded-lg border border-base-300/70 bg-base-200/30 px-3 py-2">
        You have no active listings to offer. List a book first, then come back to propose a swap.
      </p>
    );
  }

  return (
    <div
      className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-base-300/70 bg-base-200/20 p-2"
      role="listbox"
      aria-label="Choose a book to offer"
    >
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            className={`btn btn-sm h-auto min-h-10 w-full justify-start whitespace-normal rounded-lg px-3 py-2 text-left text-sm font-normal leading-snug ${
              selected
                ? "btn-secondary"
                : "btn-ghost border border-base-300/60 bg-base-100 hover:border-secondary/30"
            }`}
            onClick={() => onChange(o.id)}
          >
            {o.title}
          </button>
        );
      })}
    </div>
  );
}
