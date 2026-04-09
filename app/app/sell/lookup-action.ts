"use server";

import { lookupIsbn } from "@/lib/books/lookupIsbn";

export async function lookupIsbnAction(raw: string) {
  try {
    return await lookupIsbn(raw);
  } catch (e) {
    console.error("[lookupIsbnAction]", e);
    return null;
  }
}
