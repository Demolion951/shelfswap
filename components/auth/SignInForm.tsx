"use client";

/**
 * Sign-in form (email/password) for ShelfSwap.
 * Submits to a server action; lives under /components/auth for reuse.
 */
import { signInWithPassword, type AuthActionState } from "@/app/auth/actions";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

type Props = {
  defaultNext?: string;
  passwordResetSuccess?: boolean;
};

const initialState: AuthActionState = {};

export function SignInForm({
  defaultNext = "/app/home",
  passwordResetSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <form action={formAction} className="card bg-base-100 w-full max-w-md shadow-xl">
      <input type="hidden" name="next" value={defaultNext} />
      <div className="card-body gap-4">
        <h1 className="card-title text-2xl">Sign in</h1>
        {passwordResetSuccess ? (
          <div role="status" className="alert alert-success text-sm">
            Password updated. Sign in with your new password.
          </div>
        ) : null}
        {state.error ? (
          <div role="alert" className="alert alert-error text-sm">
            {state.error}
          </div>
        ) : null}
        <label className="form-control w-full">
          <span className="label-text">Email</span>
          <input
            ref={emailRef}
            className="input input-bordered w-full"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="form-control w-full">
          <div className="label py-1">
            <span className="label-text">Password</span>
            <Link
              href="/auth/forgot-password"
              className="label-text-alt link link-primary"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              className="input input-bordered w-full pr-11"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </label>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending}
        >
          {pending ? <span className="loading loading-spinner" /> : "Sign in"}
        </button>
        <p className="text-center text-sm opacity-80">
          No account?{" "}
          <a href="/auth/sign-up" className="link link-primary">
            Sign up
          </a>
        </p>
      </div>
    </form>
  );
}
