"use client";

/**
 * Settings / profile: upload or clear the signed-in user’s profile photo (profiles.avatar_url).
 * Location: components/profile/ProfileAvatarUploader.tsx
 */
import { clearProfileAvatarAction, updateProfileAvatarAction } from "@/app/app/profile/avatar-actions";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  initialAvatarUrl: string | null;
  displayName: string;
};

export function ProfileAvatarUploader({ initialAvatarUrl, displayName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPreview(initialAvatarUrl);
  }, [initialAvatarUrl]);

  function onPick() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      const res = await updateProfileAvatarAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onClear() {
    setError(null);
    startTransition(async () => {
      const res = await clearProfileAvatarAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <div className="avatar placeholder">
        <div className="w-24 rounded-full border-2 border-base-300/80 bg-base-200 ring ring-base-100 ring-offset-2 ring-offset-base-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
              width={96}
              height={96}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-primary">
              <span className="text-3xl font-serif leading-none select-none">{initial}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2 text-center sm:text-left">
        <p className="text-sm text-base-content/70">Profile photo (optional)</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={onFile}
        />
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            className="btn btn-primary btn-sm gap-2"
            disabled={pending}
            onClick={() => onPick()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
            Upload photo
          </button>
          {preview ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm gap-2 text-error"
              disabled={pending}
              onClick={() => onClear()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-base-content/50">JPG, PNG or WebP — max 2MB.</p>
        {error ? (
          <div role="alert" className="alert alert-error text-xs py-2">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
