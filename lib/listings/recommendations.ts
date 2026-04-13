import { createClient } from "@/lib/supabase/server";
import type { ListingWithRelations } from "@/lib/listings/queries";

type EventRow = {
  type: string;
  listing_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ListingSignalRow = {
  id: string;
  author: string | null;
  title: string;
  metadata: unknown;
};

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && w.length <= 24);
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function getListingSubjects(listing: any | null | undefined): string[] {
  const meta = listing?.metadata;
  if (!meta || typeof meta !== "object") return [];
  const subjects = (meta as Record<string, unknown>).subjects;
  if (!Array.isArray(subjects)) return [];
  return subjects
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 40)
    .slice(0, 16);
}

function addScore(map: Map<string, number>, key: string, delta: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + delta);
}

function daysAgo(ts: string): number {
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return 9999;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/**
 * Reader-interest recommender (lightweight, production-safe):
 * Uses multi-interaction history and subjects/genres enrichment stored in listings.metadata.subjects.
 *
 * Signals (strongest → weakest):
 * - subject overlap from unlock/save history
 * - author affinity
 * - repeated search intent (tokens)
 * - local relevance (distance_km)
 * - quality (photos) + recency
 *
 * Location: lib/listings/recommendations.ts
 */
export async function recommendListingsForUser(
  userId: string,
  pool: ListingWithRelations[],
  limit = 12,
  excludeIds?: Set<string>,
): Promise<ListingWithRelations[]> {
  const filteredPool = excludeIds ? pool.filter((p) => !excludeIds.has(p.id)) : pool;
  if (filteredPool.length <= limit) return filteredPool.slice(0, limit);

  const supabase = await createClient();

  const { data: evRows, error: evErr } = await supabase
    .from("events")
    .select("type, listing_id, payload, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (evErr) {
    console.warn("[recommendListingsForUser] events", evErr.message);
    return filteredPool.slice(0, limit);
  }

  const events = (evRows ?? []) as EventRow[];

  // Collect listing ids referenced by meaningful events.
  const signalListingIds = Array.from(
    new Set(
      events
        .filter((e) =>
          e.listing_id &&
          (e.type === "unlock_listing" ||
            e.type === "save_listing" ||
            e.type === "view_listing" ||
            e.type === "message_sent"),
        )
        .map((e) => e.listing_id as string),
    ),
  ).slice(0, 40);

  const listingById = new Map<string, ListingSignalRow>();
  if (signalListingIds.length > 0) {
    const { data: rows, error: lErr } = await supabase
      .from("listings")
      .select("id, author, title, metadata")
      .in("id", signalListingIds);
    if (lErr) {
      console.warn("[recommendListingsForUser] listings for signals", lErr.message);
    } else {
      for (const r of (rows ?? []) as ListingSignalRow[]) {
        listingById.set(String(r.id), r);
      }
    }
  }

  // Taste profile maps.
  const subjectScore = new Map<string, number>();
  const authorScore = new Map<string, number>();
  const searchTokenScore = new Map<string, number>();

  for (const e of events) {
    const age = daysAgo(e.created_at);
    const recency = clamp01(1 - age / 21); // 0..1 over ~3 weeks

    if (e.type === "search_query") {
      const q = String((e.payload ?? {}).q ?? "").trim();
      if (q.length < 2) continue;
      const tokens = normalizeWords(q);
      for (const t of tokens) addScore(searchTokenScore, t, 2 * recency);
      continue;
    }

    if (!e.listing_id) continue;
    const listing = listingById.get(e.listing_id);
    if (!listing) continue;

    const subjects = getListingSubjects(listing);
    const author = (listing.author ?? "").trim().toLowerCase();

    if (e.type === "unlock_listing") {
      for (const s of subjects) addScore(subjectScore, s, 8 * recency);
      if (author) addScore(authorScore, author, 6 * recency);
    } else if (e.type === "save_listing") {
      for (const s of subjects) addScore(subjectScore, s, 6 * recency);
      if (author) addScore(authorScore, author, 4 * recency);
    } else if (e.type === "message_sent") {
      for (const s of subjects) addScore(subjectScore, s, 2 * recency);
      if (author) addScore(authorScore, author, 1.5 * recency);
    } else if (e.type === "view_listing") {
      for (const s of subjects) addScore(subjectScore, s, 1 * recency);
    }
  }

  // If we have essentially no taste signals yet, fall back to a sensible non-random ranking.
  const hasTaste =
    subjectScore.size > 0 || authorScore.size > 0 || searchTokenScore.size > 0;
  if (!hasTaste) {
    const scored = filteredPool.map((l) => {
      const photos = l.listing_photos?.length ?? 0;
      const recency = Math.max(
        0,
        10 - Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000),
      );
      const score = photos * 2 + recency;
      const tiebreak = stableHash(`${userId}:${l.id}`) % 1000;
      return { l, score, tiebreak };
    });
    scored.sort((a, b) => (b.score - a.score) || (b.tiebreak - a.tiebreak));
    return scored.map((s) => s.l).slice(0, limit);
  }

  const scored = filteredPool.map((l) => {
    // Subjects from listing enrichment.
    const subjects = getListingSubjects(l);
    let subj = 0;
    for (const s of subjects) subj += subjectScore.get(s) ?? 0;
    subj = Math.min(120, subj);

    // Author affinity.
    const author = (l.author ?? "").trim().toLowerCase();
    const auth = author ? Math.min(60, authorScore.get(author) ?? 0) : 0;

    // Search intent (tokens in title/author/subjects).
    const tokens = new Set<string>([
      ...normalizeWords(l.title),
      ...normalizeWords(l.author ?? ""),
      ...subjects.flatMap(normalizeWords),
    ]);
    let intent = 0;
    for (const [t, w] of searchTokenScore.entries()) {
      if (tokens.has(t)) intent += w;
    }
    intent = Math.min(40, intent);

    // Local relevance: prefer near-you when available.
    const km = typeof l.distance_km === "number" ? l.distance_km : null;
    const local = km == null ? 0 : Math.max(0, 30 - km * 1.5); // fades by ~20km

    // Quality + recency.
    const photos = l.listing_photos?.length ?? 0;
    const quality = Math.min(10, photos * 2);
    const ageDays = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86_400_000);
    const recent = Math.max(0, 10 - Math.max(0, ageDays));

    const score = subj + auth + intent + local + quality + recent;
    const tiebreak = stableHash(`${userId}:${l.id}`) % 1000;
    return { l, score, tiebreak };
  });

  scored.sort((a, b) => (b.score - a.score) || (b.tiebreak - a.tiebreak));
  return scored.map((s) => s.l).slice(0, limit);
}

