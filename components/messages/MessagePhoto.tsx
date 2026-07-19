"use client";

/**
 * Tappable message photo that opens ImageLightbox for zoom.
 * Location: components/messages/MessagePhoto.tsx
 */
import { ImageLightbox } from "@/components/ImageLightbox";
import { useState } from "react";

type Props = {
  src: string;
  className?: string;
};

export function MessagePhoto({
  src,
  className = "mb-1 max-h-48 w-full rounded-md object-cover",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="block w-full cursor-zoom-in overflow-hidden rounded-md p-0 text-left"
        onClick={() => setOpen(true)}
        aria-label="View photo full size"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={className} loading="lazy" />
      </button>
      <ImageLightbox src={src} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
