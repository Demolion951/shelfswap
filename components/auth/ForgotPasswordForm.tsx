"use client";

/**
 * Request a password reset email (Supabase auth). Generic success message for privacy.
 * Location: components/auth/ForgotPasswordForm.tsx
 */
import { requestPasswordReset, type AuthActionState } from "@/app/auth/actions";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <form action={formAction} className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body gap-4">
        <h1 className="card-title text-2xl">Forgot password</h1>
        <p className="text-sm text-base-content/65">
          Enter the email you use for ShelfSwap. We&apos;ll send a link to choose a new password.
        </p>
        {state.error ? (
          <div role="alert" className="alert alert-error text-sm">
            {state.error}
          </div>
        ) : null}
        {state.message ? (
          <div role="status" className="alert alert-success text-sm">
            {state.message}
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
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? <span className="loading loading-spinner" /> : "Send reset link"}
        </button>
        <p className="text-center text-sm opacity-80">
          <Link href="/auth/sign-in" className="link link-primary">
            Back to sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
