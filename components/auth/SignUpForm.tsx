"use client";

/**
 * Sign-up form (email/password + display name) for ShelfSwap.
 * Server action creates the auth user; DB trigger provisions profiles.
 */
import { signUpWithPassword, type AuthActionState } from "@/app/auth/actions";
import { useActionState, useRef, useEffect } from "react";

type Props = {
  defaultNext?: string;
};

const initialState: AuthActionState = {};

export function SignUpForm({ defaultNext = "/app/home" }: Props) {
  const [state, formAction, pending] = useActionState(
    signUpWithPassword,
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
        <h1 className="card-title text-2xl">Create account</h1>
        {state.error ? (
          <div role="alert" className="alert alert-warning text-sm">
            {state.error}
          </div>
        ) : null}
        <label className="form-control w-full">
          <span className="label-text">Display name</span>
          <input
            className="input input-bordered w-full"
            name="display_name"
            type="text"
            autoComplete="nickname"
            placeholder="Optional"
          />
        </label>
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
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending}
        >
          {pending ? <span className="loading loading-spinner" /> : "Sign up"}
        </button>
        <p className="text-center text-sm opacity-80">
          Already have an account?{" "}
          <a href="/auth/sign-in" className="link link-primary">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}
