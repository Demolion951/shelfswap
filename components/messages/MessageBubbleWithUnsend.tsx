"use client";

/**
 * Own-message bubble with long-press (mobile) or right-click / ⋯ (desktop) to unsend.
 * Root must be the chat-bubble element so DaisyUI chat-end alignment works.
 * Location: components/messages/MessageBubbleWithUnsend.tsx
 */
import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LONG_PRESS_MS = 500;

type Props = {
  messageId: string;
  canUnsend: boolean;
  unsending: boolean;
  deleted: boolean;
  className: string;
  onUnsend: (messageId: string) => void;
  children: React.ReactNode;
};

export function MessageBubbleWithUnsend({
  messageId,
  canUnsend,
  unsending,
  deleted,
  className,
  onUnsend,
  children,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!bubbleRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [menuOpen]);

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openMenu() {
    if (!canUnsend || unsending || deleted) return;
    setMenuOpen(true);
  }

  function onBubblePointerDown(e: React.PointerEvent) {
    if (!canUnsend || unsending || deleted || e.pointerType === "mouse") return;
    longPressTriggeredRef.current = false;
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openMenu();
    }, LONG_PRESS_MS);
  }

  function onBubblePointerUp() {
    cancelLongPress();
  }

  function onBubbleContextMenu(e: React.MouseEvent) {
    if (!canUnsend || unsending || deleted) return;
    e.preventDefault();
    openMenu();
  }

  function onUnsendClick() {
    setMenuOpen(false);
    onUnsend(messageId);
  }

  return (
    <div
      ref={bubbleRef}
      className={`group relative ${className} ${canUnsend && !deleted ? "select-none touch-manipulation" : ""}`}
      onPointerDown={onBubblePointerDown}
      onPointerUp={onBubblePointerUp}
      onPointerLeave={onBubblePointerUp}
      onPointerCancel={onBubblePointerUp}
      onContextMenu={onBubbleContextMenu}
      onClick={(e) => {
        if (longPressTriggeredRef.current) {
          e.preventDefault();
          longPressTriggeredRef.current = false;
        }
      }}
    >
      {children}

      {canUnsend && !deleted ? (
        <button
          type="button"
          className={`btn btn-ghost btn-xs btn-circle absolute right-0.5 top-0.5 hidden h-6 min-h-0 w-6 sm:inline-flex ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-70 group-focus-within:opacity-100"
          }`}
          aria-label="Message options"
          aria-expanded={menuOpen}
          disabled={unsending}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}

      {menuOpen && canUnsend && !deleted ? (
        <ul
          className={`menu menu-xs rounded-box border border-base-300/80 bg-base-100 shadow-md absolute z-20 w-36 p-1 right-0 ${
            unsending ? "pointer-events-none opacity-70" : ""
          } bottom-full mb-1`}
          role="menu"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="gap-2 text-error"
              disabled={unsending}
              onClick={onUnsendClick}
            >
              {unsending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              Unsend
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
