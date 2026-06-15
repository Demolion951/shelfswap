/**
 * Classify listings into browse genres from Open Library / Google catalogue subjects.
 * Location: lib/books/bookCategory.ts
 */

export type BookCategory = "fiction" | "non_fiction" | "childrens";

export const BOOK_CATEGORIES: BookCategory[] = ["fiction", "non_fiction", "childrens"];

export const BOOK_CATEGORY_LABELS: Record<BookCategory, string> = {
  fiction: "Fiction",
  non_fiction: "Non-fiction",
  childrens: "Children's",
};

const CHILDREN_SUBJECT = /juvenile|children'?s?|kids|picture books?|early reader|board books?|young readers?|ages \d|middle grade|chapter books?/i;
const CHILDREN_TITLE = /children'?s|for kids|picture book|board book/i;

const NON_FICTION_SUBJECT =
  /non[- ]?fiction|biograph|autobiograph|memoir|history|science|self[- ]?help|politic|business|cookery|cooking|travel|health|psycholog|philosoph|religion|education|reference|true crime|economics|sociolog|anthropolog|nature|medical|law|art history|essays?/i;

const FICTION_SUBJECT =
  /fiction|novels?|mystery|romance|thriller|fantasy|science fiction|literature|short stories|horror|poetry|drama|fairy tales?/i;

function normalizeSubjects(subjects: string[]): string[] {
  return subjects.map((s) => s.trim()).filter((s) => s.length >= 2);
}

/**
 * Map catalogue subject lines (+ optional title/author) to a browse genre.
 * Defaults to fiction when signals are ambiguous (most ambiguous OL listings are novels).
 */
export function classifyBookCategory(
  subjects: string[],
  title = "",
  author = "",
): BookCategory {
  const subs = normalizeSubjects(subjects);
  const titleL = title.toLowerCase();
  const authorL = author.toLowerCase();
  const combined = `${subs.join(" ")} ${titleL} ${authorL}`.toLowerCase();

  if (subs.some((s) => CHILDREN_SUBJECT.test(s)) || CHILDREN_TITLE.test(titleL)) {
    return "childrens";
  }
  if (/juvenile fiction|children'?s stories|children'?s fiction|young adult fiction/i.test(combined)) {
    return "childrens";
  }

  if (subs.some((s) => NON_FICTION_SUBJECT.test(s))) {
    return "non_fiction";
  }

  if (subs.some((s) => FICTION_SUBJECT.test(s))) {
    return "fiction";
  }

  if (/textbook|handbook|manual|guide to|how to|dictionary|encyclopedia/i.test(titleL)) {
    return "non_fiction";
  }

  return "fiction";
}

export function isBookCategory(value: string | null | undefined): value is BookCategory {
  return value === "fiction" || value === "non_fiction" || value === "childrens";
}

/** Subjects saved at list time from Open Library enrichment (`metadata.subjects`). */
export function subjectsFromListingMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const subjects = (metadata as Record<string, unknown>).subjects;
  if (!Array.isArray(subjects)) return [];
  return subjects.filter((s): s is string => typeof s === "string");
}

/** Stored column, else classify from catalogue subjects or title/author. */
export function effectiveBookCategory(listing: {
  book_category: string | null;
  metadata?: unknown;
  title: string;
  author: string | null;
}): BookCategory {
  if (isBookCategory(listing.book_category)) return listing.book_category;
  const subjects = subjectsFromListingMetadata(listing.metadata);
  return classifyBookCategory(subjects, listing.title, listing.author ?? "");
}
