"use client";

/**
 * Sign-up form: name, email, birthday, sex, and password for ShelfSwap.
 * Server action creates auth user; DB trigger provisions profiles row.
 * Location: components/auth/SignUpForm.tsx
 */
import { signUpWithPassword, type AuthActionState } from "@/app/auth/actions";
import { PROFILE_SEX_OPTIONS } from "@/lib/auth/signupProfile";
import { useActionState, useRef, useEffect } from "react";

type Props = {
  defaultNext?: string;
};

const initialState: AuthActionState = {};

function maxBirthdayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minBirthdayIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SignUpForm({ defaultNext = "/app/home" }: Props) {
  const [state, formAction, pending] = useActionState(
    signUpWithPassword,
    initialState,
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
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
        {state.message ? (
          <div role="status" className="alert alert-success text-sm">
            {state.message}
          </div>
        ) : null}
        <label className="form-control w-full">
          <span className="label-text">Name</span>
          <input
            ref={nameRef}
            className="input input-bordered w-full"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            required
            minLength={2}
            maxLength={80}
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text">Email</span>
          <input
            className="input input-bordered w-full"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text">Birthday</span>
          <input
            className="input input-bordered w-full"
            name="birthday"
            type="date"
            autoComplete="bday"
            required
            min={minBirthdayIso()}
            max={maxBirthdayIso()}
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text">Sex</span>
          <select
            className="select select-bordered w-full"
            name="sex"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Select…
            </option>
            {PROFILE_SEX_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
