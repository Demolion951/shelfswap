"use client";

/**
 * Sign-in form (email/password) for ShelfSwap.
 * Submits to a server action; lives under /components/auth for reuse.
 */
import { signInWithPassword, type AuthActionState } from "@/app/auth/actions";
import { useActionState, useRef, useEffect } from "react";

type Props = {
  defaultNext?: string;
};

const initialState: AuthActionState = {};

export function SignInForm({ defaultNext = "/app/home" }: Props) {
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <form action={formAction} className="card bg-base-100 w-full max-w-md shadow-xl">
      <input type="hidden" name="next" value={defaultNext} />
      <div className="card-body gap-4">
        <h1 className="card-title text-2xl">Sign in</h1>
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
          <span className="label-text">Password</span>
          <input
            className="input input-bordered w-full"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
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
