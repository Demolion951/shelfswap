-- Credit holds + unlock requests:
-- Buyer requests chat -> credits held (not spent) until seller accepts/replies.
-- If seller declines or times out, held credits are released.

begin;

-- Track credits currently held for pending requests.
alter table public.profiles
  add column if not exists held_credits int not null default 0;

alter table public.profiles
  drop constraint if exists profiles_held_credits_nonnegative;
alter table public.profiles
  add constraint profiles_held_credits_nonnegative check (held_credits >= 0);

comment on column public.profiles.held_credits is
  'Credits reserved for pending unlock requests (not yet spent).';

-- Ensure clients can't mutate held_credits (same guard as credit_balance).
create or replace function public.profile_credit_balance_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.credit_balance is distinct from old.credit_balance)
       or (new.held_credits is distinct from old.held_credits) then
      if coalesce(current_setting('app.allow_profile_credit_write', true), '') = '1' then
        return new;
      end if;
      if coalesce((auth.jwt() ->> 'role'), '') is distinct from 'service_role' then
        raise exception 'credit balances are read-only for clients';
      end if;
    end if;
  end if;
  return new;
end $$;

-- Requests table (pending/accepted/declined/expired/cancelled).
create table if not exists public.listing_unlock_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  credits_held int not null check (credits_held >= 1 and credits_held <= 2),
  status text not null check (status in ('pending','accepted','declined','expired','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz
);

create index if not exists listing_unlock_requests_listing_idx
  on public.listing_unlock_requests (listing_id, created_at desc);
create index if not exists listing_unlock_requests_buyer_idx
  on public.listing_unlock_requests (buyer_id, created_at desc);
create unique index if not exists listing_unlock_requests_one_pending
  on public.listing_unlock_requests (buyer_id, listing_id)
  where status = 'pending';

comment on table public.listing_unlock_requests is
  'Buyer requests to unlock chat; credits are held until seller accepts.';

alter table public.listing_unlock_requests enable row level security;

drop policy if exists "lur_select_buyer" on public.listing_unlock_requests;
create policy "lur_select_buyer"
on public.listing_unlock_requests
for select
to authenticated
using (buyer_id = auth.uid());

drop policy if exists "lur_select_seller" on public.listing_unlock_requests;
create policy "lur_select_seller"
on public.listing_unlock_requests
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_unlock_requests.listing_id
      and l.user_id = auth.uid()
  )
);

-- No direct client inserts/updates/deletes; only via RPC below.

-- Expire pending requests for the current user (optional: for one listing).
create or replace function public.expire_my_unlock_requests(p_listing_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_count int := 0;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_buyer is null then
    return 0;
  end if;

  with exp as (
    select id, credits_held
    from public.listing_unlock_requests
    where buyer_id = v_buyer
      and status = 'pending'
      and expires_at <= now()
      and (p_listing_id is null or listing_id = p_listing_id)
  )
  update public.listing_unlock_requests r
  set status = 'expired', decided_at = now()
  from exp
  where r.id = exp.id;

  get diagnostics v_count = row_count;
  if v_count > 0 then
    update public.profiles
    set held_credits = greatest(0, held_credits - (
      select coalesce(sum(credits_held), 0)::int from exp
    ))
    where id = v_buyer;
  end if;

  return v_count;
end $$;

revoke all on function public.expire_my_unlock_requests(uuid) from public;
grant execute on function public.expire_my_unlock_requests(uuid) to authenticated;

-- Buyer requests unlock: holds credits until seller accepts.
create or replace function public.request_unlock_hold(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_cost int;
  v_req_id uuid;
  v_avail int;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  perform public.expire_my_unlock_requests(p_listing_id);

  select l.user_id,
    case when l.unlock_credits = 2 then 2 else 1 end
  into v_seller, v_cost
  from public.listings l
  where l.id = p_listing_id and l.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;
  if v_seller = v_buyer then
    return jsonb_build_object('ok', false, 'error', 'own_listing');
  end if;

  if exists (
    select 1 from public.listing_unlocks u
    where u.buyer_id = v_buyer and u.listing_id = p_listing_id
  ) then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  select (p.credit_balance - p.held_credits)
  into v_avail
  from public.profiles p
  where p.id = v_buyer
  for update;

  if v_avail is null or v_avail < v_cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'required', v_cost);
  end if;

  begin
    insert into public.listing_unlock_requests (buyer_id, listing_id, credits_held, status, expires_at)
    values (v_buyer, p_listing_id, v_cost, 'pending', now() + interval '24 hours')
    returning id into v_req_id;
  exception
    when unique_violation then
      select id into v_req_id
      from public.listing_unlock_requests
      where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending';
      return jsonb_build_object('ok', true, 'pending', true, 'request_id', v_req_id, 'required', v_cost);
  end;

  update public.profiles
  set held_credits = held_credits + v_cost
  where id = v_buyer;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_seller,
    'unlock_request',
    p_listing_id,
    jsonb_build_object('buyer_id', v_buyer, 'credits', v_cost)
  );

  return jsonb_build_object('ok', true, 'pending', true, 'request_id', v_req_id, 'required', v_cost);
end $$;

revoke all on function public.request_unlock_hold(uuid) from public;
grant execute on function public.request_unlock_hold(uuid) to authenticated;

-- Buyer cancels a pending request (releases held credits).
create or replace function public.cancel_unlock_hold(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_cost int := 0;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select credits_held into v_cost
  from public.listing_unlock_requests
  where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  update public.listing_unlock_requests
  set status = 'cancelled', decided_at = now()
  where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending';

  update public.profiles
  set held_credits = greatest(0, held_credits - v_cost)
  where id = v_buyer;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cancel_unlock_hold(uuid) from public;
grant execute on function public.cancel_unlock_hold(uuid) to authenticated;

-- Seller responds to a request: accept captures credits + creates listing_unlocks.
create or replace function public.respond_unlock_hold(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v_buyer uuid;
  v_listing uuid;
  v_cost int;
  v_status text;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select r.buyer_id, r.listing_id, r.credits_held, r.status
  into v_buyer, v_listing, v_cost, v_status
  from public.listing_unlock_requests r
  where r.id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.listings l
    where l.id = v_listing and l.user_id = v_seller
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if v_status <> 'pending' then
    return jsonb_build_object('ok', true, 'noop', true, 'status', v_status);
  end if;

  if (select expires_at <= now() from public.listing_unlock_requests where id = p_request_id) then
    -- Expired: release and mark expired.
    update public.listing_unlock_requests
    set status = 'expired', decided_at = now()
    where id = p_request_id;
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    return jsonb_build_object('ok', true, 'expired', true);
  end if;

  if not p_accept then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = p_request_id;
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    insert into public.notifications (user_id, type, listing_id, payload)
    values (v_buyer, 'unlock_declined', v_listing, jsonb_build_object('credits', v_cost));
    return jsonb_build_object('ok', true, 'declined', true);
  end if;

  -- Accept: capture credits and create unlock row.
  update public.profiles
  set credit_balance = credit_balance - v_cost,
      held_credits = greatest(0, held_credits - v_cost)
  where id = v_buyer and (credit_balance - held_credits) >= v_cost;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'insufficient_credits');
  end if;

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = p_request_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent)
  values (v_buyer, v_listing, v_cost)
  on conflict (buyer_id, listing_id) do nothing;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', v_listing, jsonb_build_object('credits', v_cost));

  return jsonb_build_object('ok', true, 'accepted', true, 'credits_spent', v_cost);
end $$;

revoke all on function public.respond_unlock_hold(uuid, boolean) from public;
grant execute on function public.respond_unlock_hold(uuid, boolean) to authenticated;

commit;

