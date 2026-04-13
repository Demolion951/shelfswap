-- Speed up partial/typo-ish search for type-ahead UX.
-- Uses pg_trgm so ILIKE '%query%' stays fast as listings grow.

begin;

create extension if not exists pg_trgm;

-- Trigram indexes: support fast substring / similarity search on title/author.
create index if not exists listings_title_trgm_gin
  on public.listings using gin (title gin_trgm_ops);

create index if not exists listings_author_trgm_gin
  on public.listings using gin (author gin_trgm_ops);

commit;

