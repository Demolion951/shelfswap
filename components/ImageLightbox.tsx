"use client";

/**
 * Full-screen photo viewer with pinch/wheel zoom and drag-to-pan.
 * Location: components/ImageLightbox.tsx
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function ImageLightbox({ src, alt = "", open, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function clampOffset(next: { x: number; y: number }, nextScale: number) {
    if (nextScale <= 1) return { x: 0, y: 0 };
    const max = 180 * nextScale;
    return {
      x: Math.max(-max, Math.min(max, next.x)),
      y: Math.max(-max, Math.min(max, next.y)),
    };
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      setOffset((o) => clampOffset(o, next));
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag?.active) return;
    setOffset(
      clampOffset(
        {
          x: drag.originX + (e.clientX - drag.startX),
          y: drag.originY + (e.clientY - drag.startY),
        },
        scale,
      ),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function touchDistance(touches: React.TouchList): number {
    if (touches.length < 2) return 0;
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDist: touchDistance(e.touches),
        startScale: scale,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const pinch = pinchRef.current;
    if (!pinch || e.touches.length < 2) return;
    e.preventDefault();
    const dist = touchDistance(e.touches);
    if (pinch.startDist <= 0) return;
    const next = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, pinch.startScale * (dist / pinch.startDist)),
    );
    setScale(next);
    setOffset((o) => clampOffset(o, next));
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  function onDoubleClick() {
    setScale((prev) => {
      const next = prev > 1.2 ? 1 : 2.2;
      setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral/90 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="btn btn-circle btn-sm btn-ghost absolute right-3 top-3 z-[101] text-neutral-content"
        aria-label="Close photo"
        onClick={onClose}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <div
        className="relative flex max-h-full max-w-full touch-none items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[min(92dvh,920px)] max-w-[min(96vw,920px)] select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragRef.current?.active ? "none" : "transform 120ms ease-out",
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        />
      </div>
    </div>
  );
}
