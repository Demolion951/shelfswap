-- Swap + completion state for a single accepted buyer per listing.
-- Adds deal fields to listing_unlocks and RPCs to propose/accept swap and confirm completion.
-- Also tightens unlock-hold so a listing can be unlocked by only one buyer at a time.

begin;

-- Deal state on the unlock row (one buyer per listing).
alter table public.listing_unlocks
  add column if not exists deal_type text not null default 'pickup',
  add column if not exists offered_listing_id uuid references public.listings (id) on delete set null,
  add column if not exists swap_status text,
  add column if not exists buyer_confirmed_at timestamptz,
  add column if not exists seller_confirmed_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.listing_unlocks
  drop constraint if exists listing_unlocks_deal_type_check;
alter table public.listing_unlocks
  add constraint listing_unlocks_deal_type_check check (deal_type in ('pickup','swap'));

alter table public.listing_unlocks
  drop constraint if exists listing_unlocks_swap_status_check;
alter table public.listing_unlocks
  add constraint listing_unlocks_swap_status_check check (
    swap_status is null or swap_status in ('proposed','accepted','declined')
  );

comment on column public.listing_unlocks.deal_type is 'pickup (default) or swap (buyer offered another listing).';
comment on column public.listing_unlocks.offered_listing_id is 'When deal_type=swap, buyer’s offered listing id.';
comment on column public.listing_unlocks.completed_at is 'Set when both parties confirm completion.';

-- -----------------------------------------------------------------------------
-- Tighten credit-hold flow: only one accepted buyer per listing.
-- Replaces request_unlock_hold/respond_unlock_hold to enforce exclusivity and auto-decline others.
-- -----------------------------------------------------------------------------

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

  -- If any buyer already unlocked this listing, block additional requests.
  if exists (select 1 from public.listing_unlocks u where u.listing_id = p_listing_id) then
    if exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = p_listing_id and u.buyer_id = v_buyer
    ) then
      return jsonb_build_object('ok', true, 'already_unlocked', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
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

  -- If already taken by another buyer, decline and release.
  if exists (select 1 from public.listing_unlocks u where u.listing_id = v_listing and u.buyer_id <> v_buyer) then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = p_request_id;
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
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

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type)
  values (v_buyer, v_listing, v_cost, 'pickup')
  on conflict (buyer_id, listing_id) do nothing;

  -- Auto-decline any other pending requests and release their held credits.
  with other as (
    select id, buyer_id, credits_held
    from public.listing_unlock_requests
    where listing_id = v_listing and status = 'pending' and id <> p_request_id
  )
  update public.listing_unlock_requests r
  set status = 'declined', decided_at = now()
  from other
  where r.id = other.id;

  update public.profiles p
  set held_credits = greatest(0, held_credits - coalesce(x.sum_held, 0))
  from (
    select buyer_id, sum(credits_held)::int as sum_held
    from public.listing_unlock_requests
    where listing_id = v_listing and status = 'declined' and decided_at >= now() - interval '5 seconds'
    group by buyer_id
  ) x
  where p.id = x.buyer_id;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', v_listing, jsonb_build_object('credits', v_cost));

  return jsonb_build_object('ok', true, 'accepted', true, 'credits_spent', v_cost);
end $$;

revoke all on function public.respond_unlock_hold(uuid, boolean) from public;
grant execute on function public.respond_unlock_hold(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Swap + completion RPCs
-- -----------------------------------------------------------------------------

create or replace function public.propose_swap(p_listing_id uuid, p_offered_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  update public.listing_unlocks u
  set deal_type = 'swap',
      offered_listing_id = p_offered_listing_id,
      swap_status = 'proposed'
  where u.listing_id = p_listing_id and u.buyer_id = v_buyer;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_unlocked');
  end if;

  -- sanity: offered listing must belong to buyer and be active
  if not exists (
    select 1 from public.listings l
    where l.id = p_offered_listing_id and l.user_id = v_buyer and l.status = 'active'
  ) then
    -- revert
    update public.listing_unlocks u
    set deal_type = 'pickup', offered_listing_id = null, swap_status = null
    where u.listing_id = p_listing_id and u.buyer_id = v_buyer;
    return jsonb_build_object('ok', false, 'error', 'bad_offer');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.propose_swap(uuid, uuid) from public;
grant execute on function public.propose_swap(uuid, uuid) to authenticated;

create or replace function public.respond_swap(p_listing_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_seller) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  if p_accept then
    update public.listing_unlocks u
    set swap_status = 'accepted'
    where u.listing_id = p_listing_id and u.deal_type = 'swap' and u.swap_status = 'proposed';
  else
    update public.listing_unlocks u
    set swap_status = 'declined',
        deal_type = 'pickup',
        offered_listing_id = null
    where u.listing_id = p_listing_id and u.deal_type = 'swap' and u.swap_status = 'proposed';
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_offer');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.respond_swap(uuid, boolean) from public;
grant execute on function public.respond_swap(uuid, boolean) to authenticated;

create or replace function public.confirm_deal_complete(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_buyer uuid;
  v_seller uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.buyer_id, l.user_id into v_buyer, v_seller
  from public.listing_unlocks u
  inner join public.listings l on l.id = u.listing_id
  where u.listing_id = p_listing_id
  order by u.created_at desc
  limit 1;

  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_uid = v_buyer then
    update public.listing_unlocks
    set buyer_confirmed_at = coalesce(buyer_confirmed_at, now())
    where listing_id = p_listing_id and buyer_id = v_buyer;
  elsif v_uid = v_seller then
    update public.listing_unlocks
    set seller_confirmed_at = coalesce(seller_confirmed_at, now())
    where listing_id = p_listing_id and buyer_id = v_buyer;
  else
    return jsonb_build_object('ok', false, 'error', 'not_party');
  end if;

  update public.listing_unlocks
  set completed_at = now()
  where listing_id = p_listing_id and buyer_id = v_buyer
    and completed_at is null
    and buyer_confirmed_at is not null
    and seller_confirmed_at is not null;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.confirm_deal_complete(uuid) from public;
grant execute on function public.confirm_deal_complete(uuid) to authenticated;

commit;

