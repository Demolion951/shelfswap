/**
 * Backfill book_category on listings that pre-date the genre column or missed enrichment.
 * Location: lib/listings/backfillBookCategories.ts
 */
import { classifyBookCategory, subjectsFromListingMetadata } from "@/lib/books/bookCategory";
import { createClient } from "@/lib/supabase/server";

export async function backfillMissingBookCategories(limit = 80): Promise<number> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("listings")
    .select("id, title, author, metadata")
    .eq("status", "active")
    .is("book_category", null)
    .limit(limit);

  if (error) {
    console.error("[backfillMissingBookCategories]", error.message);
    return 0;
  }

  let updated = 0;
  for (const row of rows ?? []) {
    const subjects = subjectsFromListingMetadata(row.metadata);
    const category = classifyBookCategory(
      subjects,
      String(row.title ?? ""),
      (row.author as string | null) ?? "",
    );
    const { error: upErr } = await supabase
      .from("listings")
      .update({ book_category: category })
      .eq("id", row.id as string);
    if (!upErr) updated += 1;
    else console.warn("[backfillMissingBookCategories] update", row.id, upErr.message);
  }

  return updated;
}
