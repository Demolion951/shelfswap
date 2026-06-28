"use client";

/**
 * Listing-scoped chat: seller, unlocked buyers, and buyers with a pending unlock request.
 * Supports text and optional photo attachments.
 * Location: components/listings/ListingMessagesThread.tsx
 */
import { sendListingMessageAction } from "@/app/app/listings/private-actions";
import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import { compressListingPhoto, isLikelyImageFile } from "@/lib/client/compressListingPhoto";
import type { ListingMessageRow } from "@/lib/listings/queries";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  listingId: string;
  messages: ListingMessageRow[];
  currentUserId: string | null;
  /** Buyer thread for this conversation (required for seller replies). */
  threadBuyerId?: string | null;
  /** When false, show thread read-only (e.g. seller with no buyers yet). */
  canCompose?: boolean;
  onMessageSent?: (message: ListingMessageRow) => void;
  onSyncActivity?: () => void | Promise<void>;
};

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
  const [pending, startTransition] = useTransition();
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const lastId = localMessages.length ? localMessages[localMessages.length - 1]?.id : "";

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [localMessages.length, lastId]);

  useEffect(() => {
    return () => {
      if (attachPreview) URL.revokeObjectURL(attachPreview);
    };
  }, [attachPreview]);

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
    };
    const savedBody = trimmed;
    const savedFile = attachFile;
    const savedPreview = attachPreview;
    setBody("");
    clearAttachment(false);
    setLocalMessages((prev) => [...prev, optimistic]);
    onMessageSent?.(optimistic);

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
      } else {
        if (savedPreview?.startsWith("blob:")) {
          URL.revokeObjectURL(savedPreview);
        }
        void onSyncActivity?.();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {localMessages.length > 0 ? (
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-base-300/80 bg-base-200/30 p-3">
          {localMessages.map((m) => {
            const mine = currentUserId !== null && m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`chat ${mine ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-header text-[10px] opacity-70">
                  {mine ? "You" : m.sender_display_name}
                  <LocalDateTimeText iso={m.created_at} className="ml-1 opacity-60 inline" />
                </div>
                <div
                  className={`chat-bubble text-sm max-w-[85%] ${
                    mine ? "chat-bubble-primary" : "chat-bubble-secondary"
                  }`}
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
                  {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div ref={bottomRef} className="hidden" aria-hidden />
      )}
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
