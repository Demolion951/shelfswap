-- Saves (favorites) for recommendation signals and quick revisit.

begin;

create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

comment on table public.saved_listings is 'User saved listings (favorites).';

alter table public.saved_listings enable row level security;

drop policy if exists "saved_listings_select_own" on public.saved_listings;
create policy "saved_listings_select_own"
on public.saved_listings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "saved_listings_insert_own" on public.saved_listings;
create policy "saved_listings_insert_own"
on public.saved_listings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "saved_listings_delete_own" on public.saved_listings;
create policy "saved_listings_delete_own"
on public.saved_listings
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists saved_listings_user_created_idx
  on public.saved_listings (user_id, created_at desc);

commit;

