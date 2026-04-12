-- Private pickup/contact per listing + per-listing messages for seller and unlocked buyers.
-- Public listing rows stay unchanged; pickup lives in listing_pickup (RLS: owner or unlocked buyer).

begin;

-- -----------------------------------------------------------------------------
-- Pickup / contact (never exposed in public listing SELECT; separate table + RLS)
-- -----------------------------------------------------------------------------
create table if not exists public.listing_pickup (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  pickup_instructions text not null default '',
  contact_hint text,
  updated_at timestamptz not null default now()
);

comment on table public.listing_pickup is
  'Pickup and contact notes visible only to the listing owner and buyers who unlocked.';

alter table public.listing_pickup enable row level security;

drop policy if exists "listing_pickup_select_participants" on public.listing_pickup;
create policy "listing_pickup_select_participants"
on public.listing_pickup
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = listing_pickup.listing_id and u.buyer_id = auth.uid()
  )
);

drop policy if exists "listing_pickup_insert_owner" on public.listing_pickup;
create policy "listing_pickup_insert_owner"
on public.listing_pickup
for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_pickup_update_owner" on public.listing_pickup;
create policy "listing_pickup_update_owner"
on public.listing_pickup
for update
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_pickup_delete_owner" on public.listing_pickup;
create policy "listing_pickup_delete_owner"
on public.listing_pickup
for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- Messages (one thread per listing; append-only MVP)
-- sender_display_name denormalized because profiles RLS is self-only.
-- -----------------------------------------------------------------------------
create table if not exists public.listing_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_display_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint listing_messages_body_len check (
    char_length(body) > 0 and char_length(body) <= 2000
  )
);

create index if not exists listing_messages_listing_created_idx
  on public.listing_messages (listing_id, created_at asc);

comment on table public.listing_messages is
  'Listing-scoped thread: seller and buyers who unlocked can read/post.';

alter table public.listing_messages enable row level security;

drop policy if exists "listing_messages_select_participants" on public.listing_messages;
create policy "listing_messages_select_participants"
on public.listing_messages
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_messages.listing_id and l.user_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = listing_messages.listing_id and u.buyer_id = auth.uid()
  )
);

drop policy if exists "listing_messages_insert_participants" on public.listing_messages;
create policy "listing_messages_insert_participants"
on public.listing_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    exists (
      select 1 from public.listings l
      where l.id = listing_messages.listing_id and l.user_id = auth.uid()
    )
    or exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = listing_messages.listing_id and u.buyer_id = auth.uid()
    )
  )
);

commit;
