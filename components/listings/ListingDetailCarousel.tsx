"use client";

/**
 * Listing detail carousel — catalogue cover + seller photos; arrows/dots work on desktop + mobile.
 * Location: components/listings/ListingDetailCarousel.tsx
 */
import { CoverImageChain } from "@/components/listings/CoverImageChain";
import {
  CARD_CATALOGUE_SIZE,
  DETAIL_COVER_IMG_CLASS,
  DETAIL_COVER_PLACEHOLDER_CLASS,
  listingCatalogueCoverCandidates,
  sortedListingPhotos,
} from "@/lib/listings/listingCover";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  listing: ListingWithRelations;
};

type Slide =
  | { kind: "catalogue"; candidates: string[] }
  | { kind: "seller"; id: string; src: string };

export function ListingDetailCarousel({ listing }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const dragRef = useRef<{ active: boolean; startX: number; scrollLeft: number } | null>(null);

  const catalogueCandidates = useMemo(
    () => listingCatalogueCoverCandidates(listing, CARD_CATALOGUE_SIZE),
    [listing],
  );

  const slides = useMemo((): Slide[] => {
    const out: Slide[] = [];
    if (catalogueCandidates.length > 0) {
      out.push({ kind: "catalogue", candidates: catalogueCandidates });
    }
    for (const ph of sortedListingPhotos(listing)) {
      if (!ph.url?.trim()) continue;
      out.push({
        kind: "seller",
        id: ph.id,
        src: coverImageSrcForDisplay(ph.url) ?? ph.url.trim(),
      });
    }
    return out;
  }, [catalogueCandidates, listing]);

  const scrollToSlide = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el || slides.length === 0) return;
    const clamped = Math.min(Math.max(index, 0), slides.length - 1);
    const slideWidth = el.clientWidth;
    el.scrollTo({ left: clamped * slideWidth, behavior: "smooth" });
    setActiveSlide(clamped);
  }, [slides.length]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || slides.length <= 1) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setActiveSlide(Math.min(Math.max(idx, 0), slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onScroll]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || slides.length <= 1) return;
    dragRef.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag?.active) return;
    el.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (el && dragRef.current?.active) {
      el.releasePointerCapture(e.pointerId);
      onScroll();
    }
    dragRef.current = null;
  };

  if (slides.length === 0) {
    return (
      <div className="flex justify-center py-1">
        <div className={DETAIL_COVER_PLACEHOLDER_CLASS} aria-hidden />
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="btn btn-circle btn-sm absolute left-0 top-[calc(50%-1.5rem)] z-10 -translate-y-1/2 border-base-300/80 bg-base-100/95 shadow-md"
            aria-label="Previous photo"
            onClick={() => scrollToSlide(activeSlide - 1)}
            disabled={activeSlide <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-circle btn-sm absolute right-0 top-[calc(50%-1.5rem)] z-10 -translate-y-1/2 border-base-300/80 bg-base-100/95 shadow-md"
            aria-label="Next photo"
            onClick={() => scrollToSlide(activeSlide + 1)}
            disabled={activeSlide >= slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 touch-pan-x ${
          slides.length > 1 ? "cursor-grab active:cursor-grabbing" : ""
        } [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {slides.map((slide) => (
          <div
            key={slide.kind === "catalogue" ? "catalogue" : slide.id}
            className="flex w-full min-w-full shrink-0 snap-center flex-col items-center gap-2 px-8"
          >
            <div className="flex min-h-[18rem] items-center justify-center">
              {slide.kind === "catalogue" ? (
                <CoverImageChain
                  candidates={slide.candidates}
                  className={DETAIL_COVER_IMG_CLASS}
                  noCoverClassName={DETAIL_COVER_PLACEHOLDER_CLASS}
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.src}
                  alt=""
                  className={DETAIL_COVER_IMG_CLASS}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                slide.kind === "catalogue"
                  ? "bg-primary/10 text-primary/80"
                  : "bg-base-200/80 text-base-content/55"
              }`}
            >
              {slide.kind === "catalogue" ? "Catalogue cover (ISBN)" : "Seller's copy"}
            </span>
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Book photos">
          {slides.map((slide, i) => (
            <button
              key={slide.kind === "catalogue" ? "dot-catalogue" : slide.id}
              type="button"
              role="tab"
              aria-selected={i === activeSlide}
              aria-label={
                slide.kind === "catalogue" ? "Catalogue cover" : `Seller photo ${i}`
              }
              className={`h-1.5 rounded-full transition-all ${
                i === activeSlide ? "w-4 bg-primary/70" : "w-1.5 bg-base-content/20"
              }`}
              onClick={() => scrollToSlide(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
