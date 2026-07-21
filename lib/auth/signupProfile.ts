/**
 * Validation helpers for sign-up profile fields (name, birthday, sex).
 * Location: lib/auth/signupProfile.ts
 */

export const PROFILE_SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type ProfileSex = (typeof PROFILE_SEX_OPTIONS)[number]["value"];

const VALID_SEX = new Set<string>(PROFILE_SEX_OPTIONS.map((o) => o.value));

export function parseSignupDisplayName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2) return null;
  if (name.length > 80) return null;
  return name;
}

export function parseSignupBirthday(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Birthday is required." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid birthday." };
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Enter a valid birthday." };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) {
    return { ok: false, error: "Birthday cannot be in the future." };
  }
  const minAge = new Date(today);
  minAge.setFullYear(minAge.getFullYear() - 18);
  if (date.getTime() > minAge.getTime()) {
    return { ok: false, error: "You must be at least 18 to create an account." };
  }
  const maxAge = new Date(today);
  maxAge.setFullYear(maxAge.getFullYear() - 120);
  if (date.getTime() < maxAge.getTime()) {
    return { ok: false, error: "Enter a valid birthday." };
  }
  return { ok: true, value: trimmed };
}

export function parseSignupSex(raw: string): ProfileSex | null {
  const value = raw.trim();
  if (!VALID_SEX.has(value)) return null;
  return value as ProfileSex;
}
