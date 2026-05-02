-- Buyers with a pending unlock request can read/post messages before the seller taps Accept.
-- Seller's first chat message accepts the oldest pending request (FIFO), creates listing_unlocks,
-- captures credits, and declines other pending requests on that listing.

begin;

-- ---------------------------------------------------------------------------
-- listing_messages: pending buyer is a participant (read + insert)
-- ---------------------------------------------------------------------------
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
  or exists (
    select 1 from public.listing_unlock_requests r
    where r.listing_id = listing_messages.listing_id
      and r.buyer_id = auth.uid()
      and r.status = 'pending'
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
    or exists (
      select 1 from public.listing_unlock_requests r
      where r.listing_id = listing_messages.listing_id
        and r.buyer_id = auth.uid()
        and r.status = 'pending'
    )
  )
);

-- ---------------------------------------------------------------------------
-- listing_pickup: allow buyers with pending unlock to read (same as unlocked)
-- ---------------------------------------------------------------------------
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
  or exists (
    select 1 from public.listing_unlock_requests r
    where r.listing_id = listing_pickup.listing_id
      and r.buyer_id = auth.uid()
      and r.status = 'pending'
  )
);

-- ---------------------------------------------------------------------------
-- Seller message: Path A — capture if unlock row exists (RPC accept path).
-- Path B — FIFO accept pending request + unlock row + capture + decline others.
-- ---------------------------------------------------------------------------
create or replace function public.capture_unlock_credits_on_seller_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_buyer uuid;
  v_cost int;
  v_req_id uuid;
begin
  select l.user_id into v_seller from public.listings l where l.id = new.listing_id;
  if v_seller is null or new.sender_id <> v_seller then
    return new;
  end if;

  -- Path A: unlock exists, balance not yet captured (seller used Accept button first).
  select u.buyer_id, u.credits_spent into v_buyer, v_cost
  from public.listing_unlocks u
  where u.listing_id = new.listing_id
    and u.balance_captured_at is null
  limit 1;

  if v_buyer is not null then
    perform set_config('app.allow_profile_credit_write', '1', true);
    update public.profiles p
    set credit_balance = p.credit_balance - v_cost,
        held_credits = greatest(0, p.held_credits - v_cost)
    where p.id = v_buyer;
    update public.listing_unlocks u
    set balance_captured_at = now()
    where u.listing_id = new.listing_id
      and u.buyer_id = v_buyer
      and u.balance_captured_at is null;
    return new;
  end if;

  -- Path B: no unlock row — seller’s first message accepts oldest pending request (FIFO).
  select r.id, r.buyer_id, r.credits_held
  into v_req_id, v_buyer, v_cost
  from public.listing_unlock_requests r
  inner join public.listings l on l.id = r.listing_id and l.user_id = new.sender_id
  where r.listing_id = new.listing_id
    and r.status = 'pending'
  order by r.created_at asc
  limit 1;

  if v_buyer is null then
    return new;
  end if;

  perform set_config('app.allow_profile_credit_write', '1', true);

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = v_req_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, new.listing_id, v_cost, 'pickup', now());

  update public.profiles p
  set credit_balance = p.credit_balance - v_cost,
      held_credits = greatest(0, p.held_credits - v_cost)
  where p.id = v_buyer;

  with other as (
    select id, buyer_id, credits_held
    from public.listing_unlock_requests
    where listing_id = new.listing_id and status = 'pending' and id <> v_req_id
  )
  update public.listing_unlock_requests r
  set status = 'declined', decided_at = now()
  from other
  where r.id = other.id;

  update public.profiles p
  set held_credits = greatest(0, p.held_credits - coalesce(x.sum_held, 0))
  from (
    select buyer_id, sum(credits_held)::int as sum_held
    from public.listing_unlock_requests
    where listing_id = new.listing_id
      and status = 'declined'
      and decided_at >= now() - interval '5 seconds'
    group by buyer_id
  ) x
  where p.id = x.buyer_id;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', new.listing_id, jsonb_build_object('credits', v_cost));

  return new;
end $$;

commit;
