"use client";

/**
 * Listing detail photo carousel — seller photos first; catalogue cover only when no uploads.
 * Location: components/listings/ListingDetailCarousel.tsx
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import {
  catalogueListingCoverSrc,
  listingCoverFallbackSrc,
  sortedListingPhotos,
} from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";

type Props = {
  listing: ListingWithRelations;
};

function CarouselImage({ src, listing }: { src: string; listing: ListingWithRelations }) {
  function onError(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied === "1") {
      img.style.visibility = "hidden";
      return;
    }
    const next = listingCoverFallbackSrc(listing, img.src, "L");
    if (!next) {
      img.style.visibility = "hidden";
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.src = next;
  }

  return (
    <div className="carousel-item w-[85%] max-w-sm first:pl-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-80 w-full rounded-lg object-contain bg-base-300/30"
        referrerPolicy="no-referrer"
        onError={onError}
      />
    </div>
  );
}

export function ListingDetailCarousel({ listing }: Props) {
  const photos = sortedListingPhotos(listing);
  const catalogue = catalogueListingCoverSrc(listing, "L");

  const slides: string[] = [];
  for (const ph of photos) {
    if (!ph.url?.trim()) continue;
    slides.push(coverImageSrcForDisplay(ph.url) ?? ph.url);
  }
  if (slides.length === 0 && catalogue) {
    slides.push(catalogue);
  }

  if (slides.length === 0) {
    return (
      <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
        <div className="carousel-item flex min-h-[14rem] w-full items-center justify-center rounded-lg bg-base-300/40 text-sm text-base-content/45">
          No cover image for this listing
        </div>
      </div>
    );
  }

  return (
    <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
      {slides.map((src, i) => (
        <CarouselImage key={`${src}-${i}`} src={src} listing={listing} />
      ))}
    </div>
  );
}
