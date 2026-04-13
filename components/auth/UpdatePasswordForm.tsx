"use client";

/**
 * New password after user opens Supabase recovery link (session / PASSWORD_RECOVERY).
 * Location: components/auth/UpdatePasswordForm.tsx
 */
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setHasSession(true);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasSession(!!session);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.auth.signOut();
    router.push("/auth/sign-in?reset=ok");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body items-center gap-4 py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/60">Checking your reset link…</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body gap-4">
          <h1 className="card-title text-2xl">Link expired</h1>
          <p className="text-sm text-base-content/65">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
          <Link href="/auth/forgot-password" className="btn btn-primary btn-block">
            Request new link
          </Link>
          <Link href="/auth/sign-in" className="btn btn-ghost btn-block">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <h1 className="card-title text-2xl">Choose a new password</h1>
        {error ? (
          <div role="alert" className="alert alert-error text-sm">
            {error}
          </div>
        ) : null}
        <label className="form-control w-full">
          <span className="label-text">New password</span>
          <div className="relative">
            <input
              className="input input-bordered w-full pr-11"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              aria-pressed={showPwd}
            >
              {showPwd ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? <span className="loading loading-spinner" /> : "Update password"}
        </button>
      </div>
    </form>
  );
}
