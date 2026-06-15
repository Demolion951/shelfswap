-- Browse genre filter: Fiction, Non-fiction, Children's (from Open Library subjects at list time).
-- Location: database/migrations/20260516_listing_book_category.sql

begin;

alter table public.listings
  add column if not exists book_category text;

alter table public.listings
  drop constraint if exists listings_book_category_check;

alter table public.listings
  add constraint listings_book_category_check check (
    book_category is null
    or book_category in ('fiction', 'non_fiction', 'childrens')
  );

create index if not exists listings_active_book_category_idx
  on public.listings (book_category)
  where status = 'active';

comment on column public.listings.book_category is
  'ShelfSwap browse genre: fiction, non_fiction, childrens — classified from catalogue subjects at list time.';

commit;
