-- ShelfSwap Phase 1–2 Core Schema
-- Creates: profiles, listings, listing_photos, events (+ enums, indexes, RLS, storage bucket policies)
-- Designed to be forward-compatible with future credits/unlocks (location stored as approximate only for now).

begin;

-- Extensions commonly available on Supabase
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_condition') then
    create type public.listing_condition as enum ('new', 'like_new', 'good', 'acceptable');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('active', 'archived');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  -- Approximate user location; used for distance calculations/recommendations.
  -- Exact location for listings is intentionally NOT stored yet (future unlock feature).
  approx_location geography(point, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-provision profile row on auth signup (idempotent)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'New user'), null)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- listings
-- -----------------------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  isbn text,
  title text not null,
  author text,
  cover_url text,
  condition public.listing_condition not null,
  price_cents int not null check (price_cents >= 0),
  open_to_swaps boolean not null default false,
  -- Approximate listing location only (safe to expose publicly).
  approx_geo geography(point, 4326),
  description text,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Forward-compatibility: a stable “public summary” field you can expand later
  -- without breaking clients (e.g. edition, publisher, genre, etc.).
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists trg_listings_set_updated_at on public.listings;
create trigger trg_listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- Credits to unlock (1–2 per listing). Idempotent; same as 20260410_listing_unlock_credits.sql.
alter table public.listings
  add column if not exists unlock_credits smallint not null default 1;

alter table public.listings
  drop constraint if exists listings_unlock_credits_check;

alter table public.listings
  add constraint listings_unlock_credits_check
  check (unlock_credits >= 1 and unlock_credits <= 2);

comment on column public.listings.unlock_credits is 'Credits required for a buyer to unlock this listing (1 or 2).';

-- Search index (fast title/author/isbn search)
alter table public.listings
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(author, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(isbn, '')), 'C')
  ) stored;

create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_search_tsv_gin on public.listings using gin (search_tsv);
create index if not exists listings_approx_geo_gist on public.listings using gist (approx_geo);

-- -----------------------------------------------------------------------------
-- listing_photos
-- -----------------------------------------------------------------------------
create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_photos_listing_id_sort_idx
  on public.listing_photos (listing_id, sort asc, created_at asc);

-- -----------------------------------------------------------------------------
-- events (analytics/recs MVP)
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  listing_id uuid references public.listings (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_user_type_created_at_idx on public.events (user_id, type, created_at desc);
create index if not exists events_created_at_idx on public.events (created_at desc);

-- -----------------------------------------------------------------------------
-- RLS enablement
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.events enable row level security;

-- -----------------------------------------------------------------------------
-- RLS policies: profiles
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS policies: listings
-- -----------------------------------------------------------------------------
-- Public read of active listings.
-- Note: This exposes all columns of listings to the reading role.
-- We store ONLY approximate geo in Phase 1–2 to keep this safe.
drop policy if exists "listings_select_public_active" on public.listings;
create policy "listings_select_public_active"
on public.listings
for select
to authenticated, anon
using (status = 'active');

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
on public.listings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own"
on public.listings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own"
on public.listings
for delete
to authenticated
using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RLS policies: listing_photos
-- -----------------------------------------------------------------------------
-- Public read of photos for active listings
drop policy if exists "listing_photos_select_public_active_listings" on public.listing_photos;
create policy "listing_photos_select_public_active_listings"
on public.listing_photos
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.status = 'active'
  )
);

-- Only listing owner can insert/update/delete photos
drop policy if exists "listing_photos_insert_owner" on public.listing_photos;
create policy "listing_photos_insert_owner"
on public.listing_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_photos_update_owner" on public.listing_photos;
create policy "listing_photos_update_owner"
on public.listing_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_photos_delete_owner" on public.listing_photos;
create policy "listing_photos_delete_owner"
on public.listing_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.listings l
    where l.id = listing_photos.listing_id
      and l.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- RLS policies: events
-- -----------------------------------------------------------------------------
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (user_id = auth.uid());

-- No update/delete for MVP analytics events (append-only).

-- -----------------------------------------------------------------------------
-- Storage bucket (listing-photos)
-- -----------------------------------------------------------------------------
-- Bucket name: listing-photos
-- Strategy:
-- - Public read (for browsing)
-- - Authenticated users upload only under folder prefix: <auth.uid()>/<anything>
--
-- IMPORTANT: Do NOT ALTER storage.objects or CREATE POLICY on storage.objects here.
-- On hosted Supabase, storage.objects is not owned by the SQL editor role, so you get:
--   ERROR 42501: must be owner of table objects
--
-- After this migration runs, add Storage policies in the Dashboard:
--   Storage → listing-photos → Policies (New policy)
-- Or use the SQL below from a context that Supabase documents for storage (e.g. local
-- service-role migrations); for Dashboard, translate each block into a policy rule.

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do update set public = excluded.public;

-- Reference policies (apply via Dashboard UI, not as raw SQL in SQL Editor if you hit 42501):
--
-- Name: listing_photos_public_read
--   SELECT for roles: anon, authenticated
--   USING: bucket_id = 'listing-photos'
--
-- Name: listing_photos_owner_upload
--   INSERT for role: authenticated
--   WITH CHECK: bucket_id = 'listing-photos'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--
-- Name: listing_photos_owner_update
--   UPDATE for role: authenticated
--   USING + WITH CHECK: same as upload
--
-- Name: listing_photos_owner_delete
--   DELETE for role: authenticated
--   USING: bucket_id = 'listing-photos'
--     AND (storage.foldername(name))[1] = auth.uid()::text

commit;
