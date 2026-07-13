"use client";

/**
 * Listing-scoped chat: Instagram-style thread — composer stays put, list pins to latest message,
 * page scroll never jumps on send.
 * Location: components/listings/ListingMessagesThread.tsx
 */
import { deleteListingMessageAction, sendListingMessageAction } from "@/app/app/listings/private-actions";
import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import { MessageBubbleWithUnsend } from "@/components/messages/MessageBubbleWithUnsend";
import { compressListingPhoto, isLikelyImageFile } from "@/lib/client/compressListingPhoto";
import { mergeMessages } from "@/lib/listings/listingDetailTransitions";
import type { ListingMessageRow } from "@/lib/listings/queries";
import {
  canUnsendListingMessage,
  isListingMessageDeleted,
} from "@/lib/messages/unsend";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";

type Props = {
  listingId: string;
  messages: ListingMessageRow[];
  currentUserId: string | null;
  threadBuyerId?: string | null;
  canCompose?: boolean;
  onMessageSent?: (message: ListingMessageRow) => void;
  onSyncActivity?: () => void | Promise<void>;
};

const NEAR_BOTTOM_PX = 72;

export function ListingMessagesThread({
  listingId,
  messages,
  currentUserId,
  threadBuyerId = null,
  canCompose = true,
  onMessageSent,
  onSyncActivity,
}: Props) {
  const [localMessages, setLocalMessages] = useState(messages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unsendingId, setUnsendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const pageScrollLockRef = useRef<number | null>(null);

  function isNearBottom(): boolean {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }

  /** Scroll only the message list so the latest bubble sits flush at the bottom. */
  function pinListToLatest() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  /** Keep the page where it was (Send button / layout shift must not yank the viewport). */
  function lockPageScroll() {
    pageScrollLockRef.current = window.scrollY;
  }

  function restorePageScroll() {
    const y = pageScrollLockRef.current;
    if (y == null) return;
    window.scrollTo({ top: y, left: 0, behavior: "auto" });
    pageScrollLockRef.current = null;
  }

  useEffect(() => {
    setLocalMessages((current) => mergeMessages(current, messages));
  }, [messages]);

  useEffect(() => {
    return () => {
      if (attachPreview) URL.revokeObjectURL(attachPreview);
    };
  }, [attachPreview]);

  // After messages paint: pin to bottom when following the conversation (or first load).
  useLayoutEffect(() => {
    const count = localMessages.length;
    const grew = count > prevCountRef.current;
    const firstPaint = prevCountRef.current === 0 && count > 0;
    prevCountRef.current = count;

    if (count === 0) return;
    if (firstPaint || (grew && stickToBottomRef.current)) {
      pinListToLatest();
      restorePageScroll();
    }
  }, [localMessages]);

  function onListScroll() {
    stickToBottomRef.current = isNearBottom();
  }

  function clearAttachment(revokePreview = true) {
    if (revokePreview && attachPreview) URL.revokeObjectURL(attachPreview);
    setAttachFile(null);
    setAttachPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function onPickAttachment(files: FileList | null) {
    const file = files?.[0];
    if (!file || !isLikelyImageFile(file)) {
      setError("Use a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("That photo is too large. Please pick a smaller image.");
      return;
    }
    setError(null);
    clearAttachment();
    setAttachFile(file);
    setAttachPreview(URL.createObjectURL(file));
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!currentUserId) return;
    if (!canCompose) return;
    if (!trimmed && !attachFile) return;
    setError(null);

    lockPageScroll();
    stickToBottomRef.current = true;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ListingMessageRow = {
      id: optimisticId,
      listing_id: listingId,
      sender_id: currentUserId,
      sender_display_name: "You",
      body: trimmed,
      image_url: attachPreview,
      thread_buyer_id: threadBuyerId ?? currentUserId,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    const savedBody = trimmed;
    const savedFile = attachFile;
    const savedPreview = attachPreview;
    setBody("");
    clearAttachment(false);
    setLocalMessages((prev) => [...prev, optimistic]);
    onMessageSent?.(optimistic);

    // Keep focus in the composer so mobile keyboard / viewport stay stable.
    requestAnimationFrame(() => {
      pinListToLatest();
      restorePageScroll();
      textareaRef.current?.focus({ preventScroll: true });
    });

    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      if (savedFile) {
        try {
          const compressed = await compressListingPhoto(savedFile);
          const fd = new FormData();
          fd.set("listing_id", listingId);
          fd.set("photo", compressed);
          if (savedBody) fd.set("body", savedBody);
          if (threadBuyerId) fd.set("thread_buyer_id", threadBuyerId);
          const apiRes = await fetch("/api/listings/messages/photo", { method: "POST", body: fd });
          const json = (await apiRes.json()) as { ok?: boolean; error?: string; image_url?: string };
          res =
            apiRes.ok && json.ok
              ? { ok: true }
              : { ok: false, error: json.error ?? "Could not send photo." };
          if (res.ok && json.image_url) {
            setLocalMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId ? { ...m, image_url: json.image_url ?? m.image_url } : m,
              ),
            );
          }
        } catch {
          res = { ok: false, error: "Could not send photo. Check your connection." };
        }
      } else {
        const fd = new FormData();
        fd.set("listing_id", listingId);
        fd.set("body", savedBody);
        if (threadBuyerId) fd.set("thread_buyer_id", threadBuyerId);
        res = await sendListingMessageAction(fd);
      }

      if (!res.ok) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setBody(savedBody);
        if (savedFile) {
          setAttachFile(savedFile);
          setAttachPreview(savedPreview ?? URL.createObjectURL(savedFile));
        }
        setError(res.error ?? "Could not send message.");
        void onSyncActivity?.();
      } else if (savedPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(savedPreview);
      }
    });
  }

  function onUnsend(messageId: string) {
    if (!currentUserId || unsendingId) return;
    setError(null);
    setUnsendingId(messageId);
    const deletedAt = new Date().toISOString();
    setLocalMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, deleted_at: deletedAt } : m)),
    );

    startTransition(async () => {
      const res = await deleteListingMessageAction(messageId, listingId);
      setUnsendingId(null);
      if (!res.ok) {
        setLocalMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deleted_at: null } : m)),
        );
        setError(res.error ?? "Could not unsend message.");
      } else {
        void onSyncActivity?.();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {localMessages.length > 0 ? (
        <div
          ref={listRef}
          onScroll={onListScroll}
          className="flex h-64 flex-col gap-2 overflow-y-auto overscroll-y-contain rounded-lg border border-base-300/80 bg-base-200/30 p-3 [overflow-anchor:none]"
        >
          {localMessages.map((m, index) => {
            const mine = currentUserId !== null && m.sender_id === currentUserId;
            const deleted = isListingMessageDeleted(m);
            const showUnsend = canUnsendListingMessage(m, currentUserId);
            const unsending = unsendingId === m.id;
            const isNewest = index === localMessages.length - 1;
            return (
              <div
                key={m.id}
                className={`chat ${mine ? "chat-end" : "chat-start"} ${
                  isNewest && m.id.startsWith("optimistic-")
                    ? "animate-[msg-in_180ms_ease-out]"
                    : ""
                }`}
              >
                <div
                  className={`chat-header text-[10px] opacity-70 ${mine ? "text-right" : ""}`}
                >
                  {mine ? "You" : m.sender_display_name}
                  <LocalDateTimeText iso={m.created_at} className="ml-1 opacity-60 inline" />
                </div>
                {mine && showUnsend && !deleted ? (
                  <MessageBubbleWithUnsend
                    messageId={m.id}
                    canUnsend={showUnsend}
                    unsending={unsending}
                    deleted={deleted}
                    className="chat-bubble chat-bubble-primary text-sm max-w-[85%]"
                    onUnsend={onUnsend}
                  >
                    {m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image_url}
                        alt=""
                        className="mb-1 max-h-48 w-full rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                  </MessageBubbleWithUnsend>
                ) : (
                  <div
                    className={`chat-bubble text-sm max-w-[85%] ${
                      mine ? "chat-bubble-primary" : "chat-bubble-secondary"
                    } ${deleted ? "opacity-70 italic" : ""}`}
                  >
                    {deleted ? (
                      <p className="text-xs">Message unsent</p>
                    ) : (
                      <>
                        {m.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.image_url}
                            alt=""
                            className="mb-1 max-h-48 w-full rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        {m.body ? (
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
        </div>
      ) : null}

      {canCompose ? (
        <form className="flex flex-col gap-2" onSubmit={onSubmit}>
          {attachPreview ? (
            <div className="relative inline-block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachPreview}
                alt=""
                className="h-24 w-24 rounded-lg border border-base-300 object-cover"
              />
              <button
                type="button"
                className="btn btn-circle btn-xs btn-error absolute -right-1 -top-1"
                onClick={() => clearAttachment()}
                disabled={pending}
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered min-h-20 w-full text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            maxLength={2000}
            disabled={pending}
            aria-label="Message"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => onPickAttachment(e.target.files)}
          />
          {error ? (
            <div role="alert" className="alert alert-error text-sm py-2">
              {error}
            </div>
          ) : null}
          <div className="flex gap-2 self-end">
            <button
              type="button"
              className="btn btn-outline btn-sm gap-2"
              disabled={pending}
              onClick={() => photoInputRef.current?.click()}
              aria-label="Attach photo"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Photo
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm gap-2"
              disabled={pending || (!body.trim() && !attachFile)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              Send
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
