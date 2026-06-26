-- Premium subscription (£7.99/mo): unlock/buy requires active Premium; swaps allow 2 free/month without Premium.
-- Replaces credit holds/debits for unlock flow. Credit columns remain for legacy data but are unused.

begin;

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_period_end timestamptz,
  add column if not exists free_swaps_used int not null default 0,
  add column if not exists free_swaps_month char(7);

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('none', 'active', 'trialing', 'past_due', 'canceled', 'incomplete'));

alter table public.profiles
  drop constraint if exists profiles_free_swaps_used_nonnegative;
alter table public.profiles
  add constraint profiles_free_swaps_used_nonnegative check (free_swaps_used >= 0);

comment on column public.profiles.subscription_status is 'Stripe subscription status; active/trialing = Premium.';
comment on column public.profiles.free_swaps_used is 'Free swap proposals used in free_swaps_month (max 2 without Premium).';

alter table public.listing_unlocks
  add column if not exists swap_used_free_slot boolean not null default false;

create table if not exists public.stripe_subscription_events (
  stripe_event_id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Subscription helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_has_premium(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_end timestamptz;
begin
  if p_user_id is null then
    return false;
  end if;
  select subscription_status, subscription_period_end
  into v_status, v_end
  from public.profiles
  where id = p_user_id;
  if not found then
    return false;
  end if;
  if v_status not in ('active', 'trialing') then
    return false;
  end if;
  if v_end is not null and v_end <= now() then
    return false;
  end if;
  return true;
end $$;

create or replace function public._ensure_free_swap_month(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month char(7) := to_char(now() at time zone 'UTC', 'YYYY-MM');
begin
  update public.profiles
  set free_swaps_used = 0,
      free_swaps_month = v_month
  where id = p_user_id
    and (free_swaps_month is distinct from v_month);
end $$;

create or replace function public.free_swaps_remaining(p_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_used int;
  v_month char(7);
  v_current char(7) := to_char(now() at time zone 'UTC', 'YYYY-MM');
begin
  if p_user_id is null then
    return 0;
  end if;
  select free_swaps_used, free_swaps_month into v_used, v_month
  from public.profiles where id = p_user_id;
  if not found then
    return 0;
  end if;
  if v_month is distinct from v_current then
    return 2;
  end if;
  return greatest(0, 2 - coalesce(v_used, 0));
end $$;

create or replace function public.can_user_swap(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_remaining int;
begin
  v_premium := public.user_has_premium(p_user_id);
  v_remaining := public.free_swaps_remaining(p_user_id);
  return jsonb_build_object(
    'ok', v_premium or v_remaining > 0,
    'premium', v_premium,
    'free_remaining', v_remaining
  );
end $$;

create or replace function public._consume_free_swap(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month char(7) := to_char(now() at time zone 'UTC', 'YYYY-MM');
  v_used int;
begin
  perform public._ensure_free_swap_month(p_user_id);
  select free_swaps_used into v_used from public.profiles where id = p_user_id for update;
  if coalesce(v_used, 0) >= 2 then
    return false;
  end if;
  update public.profiles
  set free_swaps_used = free_swaps_used + 1,
      free_swaps_month = v_month
  where id = p_user_id;
  return true;
end $$;

create or replace function public._refund_free_swap(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._ensure_free_swap_month(p_user_id);
  update public.profiles
  set free_swaps_used = greatest(0, free_swaps_used - 1)
  where id = p_user_id;
end $$;

create or replace function public.profile_subscription_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (
      new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.subscription_status is distinct from old.subscription_status
      or new.subscription_period_end is distinct from old.subscription_period_end
    ) and coalesce((auth.jwt() ->> 'role'), '') is distinct from 'service_role' then
      raise exception 'subscription fields are read-only for clients';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_subscription_guard on public.profiles;
create trigger trg_profiles_subscription_guard
before update on public.profiles
for each row execute function public.profile_subscription_guard();

create or replace function public.stripe_apply_subscription_update(
  p_stripe_event_id text,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_stripe_event_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  update public.profiles
  set stripe_customer_id = coalesce(nullif(trim(p_customer_id), ''), stripe_customer_id),
      stripe_subscription_id = coalesce(nullif(trim(p_subscription_id), ''), stripe_subscription_id),
      subscription_status = coalesce(nullif(trim(p_status), ''), subscription_status),
      subscription_period_end = coalesce(p_period_end, subscription_period_end)
  where id = p_user_id;

  insert into public.stripe_subscription_events (stripe_event_id, user_id)
  values (p_stripe_event_id, p_user_id);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.stripe_apply_subscription_update(text, uuid, text, text, text, timestamptz) from public;
grant execute on function public.stripe_apply_subscription_update(text, uuid, text, text, text, timestamptz) to service_role;

create or replace function public.dev_grant_premium(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;
  update public.profiles
  set subscription_status = 'active',
      subscription_period_end = now() + interval '30 days'
  where id = p_user_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.dev_grant_premium(uuid) from public;
grant execute on function public.dev_grant_premium(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Unlock flow: Premium required, no credit holds
-- ---------------------------------------------------------------------------

create or replace function public.request_unlock_hold(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_req_id uuid;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.user_has_premium(v_buyer) then
    return jsonb_build_object('ok', false, 'error', 'premium_required');
  end if;

  perform public.expire_my_unlock_requests(p_listing_id);

  select l.user_id into v_seller
  from public.listings l
  where l.id = p_listing_id and l.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;
  if v_seller = v_buyer then
    return jsonb_build_object('ok', false, 'error', 'own_listing');
  end if;

  if exists (select 1 from public.listing_unlocks u where u.listing_id = p_listing_id) then
    if exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = p_listing_id and u.buyer_id = v_buyer
    ) then
      return jsonb_build_object('ok', true, 'already_unlocked', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
  end if;

  begin
    insert into public.listing_unlock_requests (buyer_id, listing_id, credits_held, status, expires_at)
    values (v_buyer, p_listing_id, 0, 'pending', now() + interval '24 hours')
    returning id into v_req_id;
  exception
    when unique_violation then
      select id into v_req_id
      from public.listing_unlock_requests
      where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending';
      return jsonb_build_object('ok', true, 'pending', true, 'request_id', v_req_id);
  end;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_seller, 'unlock_request', p_listing_id, jsonb_build_object('buyer_id', v_buyer));

  return jsonb_build_object('ok', true, 'pending', true, 'request_id', v_req_id);
end $$;

create or replace function public.cancel_unlock_hold(p_listing_id uuid)
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

  if not exists (
    select 1 from public.listing_unlock_requests
    where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', true, 'noop', true);
  end if;

  update public.listing_unlock_requests
  set status = 'cancelled', decided_at = now()
  where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending';

  return jsonb_build_object('ok', true);
end $$;

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
  v_status text;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select r.buyer_id, r.listing_id, r.status
  into v_buyer, v_listing, v_status
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
    return jsonb_build_object('ok', true, 'expired', true);
  end if;

  if not p_accept then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = p_request_id;
    insert into public.notifications (user_id, type, listing_id, payload)
    values (v_buyer, 'unlock_declined', v_listing, '{}'::jsonb);
    return jsonb_build_object('ok', true, 'declined', true);
  end if;

  if exists (select 1 from public.listing_unlocks u where u.listing_id = v_listing and u.buyer_id <> v_buyer) then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = p_request_id;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
  end if;

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = p_request_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, v_listing, 0, 'pickup', now())
  on conflict (buyer_id, listing_id) do nothing;

  update public.listing_unlock_requests
  set status = 'declined', decided_at = now()
  where listing_id = v_listing and status = 'pending' and id <> p_request_id;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', v_listing, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'accepted', true);
end $$;

create or replace function public.capture_unlock_credits_on_seller_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_buyer uuid;
  v_req_id uuid;
begin
  select l.user_id into v_seller from public.listings l where l.id = new.listing_id;
  if v_seller is null or new.sender_id <> v_seller then
    return new;
  end if;

  select u.buyer_id into v_buyer
  from public.listing_unlocks u
  where u.listing_id = new.listing_id
    and u.balance_captured_at is null
  limit 1;

  if v_buyer is not null then
    update public.listing_unlocks u
    set balance_captured_at = now(),
        credits_spent = 0
    where u.listing_id = new.listing_id
      and u.buyer_id = v_buyer
      and u.balance_captured_at is null;
    return new;
  end if;

  select r.id, r.buyer_id
  into v_req_id, v_buyer
  from public.listing_unlock_requests r
  inner join public.listings l on l.id = r.listing_id and l.user_id = new.sender_id
  where r.listing_id = new.listing_id
    and r.status = 'pending'
  order by r.created_at asc
  limit 1;

  if v_buyer is null then
    return new;
  end if;

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = v_req_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, new.listing_id, 0, 'pickup', now());

  update public.listing_unlock_requests
  set status = 'declined', decided_at = now()
  where listing_id = new.listing_id and status = 'pending' and id <> v_req_id;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', new.listing_id, '{}'::jsonb);

  return new;
end $$;

create or replace function public.propose_swap(p_listing_id uuid, p_offered_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_used_free boolean := false;
  v_swap jsonb;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_swap := public.can_user_swap(v_buyer);
  if coalesce((v_swap ->> 'ok')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'swap_limit_reached', 'free_remaining', 0);
  end if;

  if coalesce((v_swap ->> 'premium')::boolean, false) is not true then
    if not public._consume_free_swap(v_buyer) then
      return jsonb_build_object('ok', false, 'error', 'swap_limit_reached', 'free_remaining', 0);
    end if;
    v_used_free := true;
  end if;

  update public.listing_unlocks u
  set deal_type = 'swap',
      offered_listing_id = p_offered_listing_id,
      swap_status = 'proposed',
      swap_used_free_slot = v_used_free
  where u.listing_id = p_listing_id and u.buyer_id = v_buyer;

  if not found then
    if v_used_free then
      perform public._refund_free_swap(v_buyer);
    end if;
    return jsonb_build_object('ok', false, 'error', 'not_unlocked');
  end if;

  if not exists (
    select 1 from public.listings l
    where l.id = p_offered_listing_id and l.user_id = v_buyer and l.status = 'active'
  ) then
    update public.listing_unlocks u
    set deal_type = 'pickup',
        offered_listing_id = null,
        swap_status = null,
        swap_used_free_slot = false
    where u.listing_id = p_listing_id and u.buyer_id = v_buyer;
    if v_used_free then
      perform public._refund_free_swap(v_buyer);
    end if;
    return jsonb_build_object('ok', false, 'error', 'bad_offer');
  end if;

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.respond_swap(p_listing_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v_listing_title text;
  r record;
  v_any boolean := false;
  v_offered_title text;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_seller) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select l.title into v_listing_title from public.listings l where l.id = p_listing_id;

  if p_accept then
    for r in
      select u.buyer_id, u.offered_listing_id
      from public.listing_unlocks u
      where u.listing_id = p_listing_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed'
      for update
    loop
      v_any := true;
      v_offered_title := null;
      if r.offered_listing_id is not null then
        select ol.title into v_offered_title from public.listings ol where ol.id = r.offered_listing_id;
      end if;

      update public.listing_unlocks u
      set swap_status = 'accepted',
          credits_spent = 0,
          swap_credits_refunded = 0
      where u.listing_id = p_listing_id
        and u.buyer_id = r.buyer_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed';

      insert into public.notifications (user_id, type, listing_id, payload)
      values (
        r.buyer_id,
        'swap_accepted',
        p_listing_id,
        jsonb_build_object(
          'listing_title', coalesce(v_listing_title, 'their listing'),
          'offered_title', coalesce(v_offered_title, 'your book'),
          'offered_listing_id', r.offered_listing_id
        )
      );
    end loop;
  else
    for r in
      select u.buyer_id, u.offered_listing_id, u.swap_used_free_slot
      from public.listing_unlocks u
      where u.listing_id = p_listing_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed'
      for update
    loop
      v_any := true;
      v_offered_title := null;
      if r.offered_listing_id is not null then
        select ol.title into v_offered_title from public.listings ol where ol.id = r.offered_listing_id;
      end if;

      if r.swap_used_free_slot then
        perform public._refund_free_swap(r.buyer_id);
      end if;

      update public.listing_unlocks u
      set swap_status = 'declined',
          deal_type = 'pickup',
          offered_listing_id = null,
          swap_used_free_slot = false
      where u.listing_id = p_listing_id
        and u.buyer_id = r.buyer_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed';

      insert into public.notifications (user_id, type, listing_id, payload)
      values (
        r.buyer_id,
        'swap_declined',
        p_listing_id,
        jsonb_build_object(
          'listing_title', coalesce(v_listing_title, 'their listing'),
          'offered_title', coalesce(v_offered_title, 'your book'),
          'offered_listing_id', r.offered_listing_id
        )
      );
    end loop;
  end if;

  if not v_any then
    return jsonb_build_object('ok', false, 'error', 'no_offer');
  end if;

  return jsonb_build_object('ok', true);
end $$;

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
  v_row_count int := 0;
  v_completed boolean := false;
  v_sales int := 0;
  v_deal_type text;
  v_offered_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.buyer_id,
    l.user_id,
    coalesce(u.deal_type, 'pickup'),
    u.offered_listing_id
  into v_buyer, v_seller, v_deal_type, v_offered_id
  from public.listing_unlocks u
  inner join public.listings l on l.id = u.listing_id
  where u.listing_id = p_listing_id
  order by u.created_at desc
  limit 1;

  if v_buyer is null or v_seller is null then
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

  get diagnostics v_row_count = row_count;
  v_completed := v_row_count > 0;

  if v_completed then
    update public.listings
    set status = 'archived'
    where id = p_listing_id and status = 'active';

    if v_deal_type = 'swap' and v_offered_id is not null then
      update public.listings
      set status = 'archived'
      where id = v_offered_id and status = 'active';
    end if;

    insert into public.notifications (user_id, type, listing_id, payload)
    values (v_buyer, 'deal_completed', p_listing_id, jsonb_build_object('deal_type', v_deal_type));

    insert into public.notifications (user_id, type, listing_id, payload)
    values (v_seller, 'deal_completed', p_listing_id, jsonb_build_object('deal_type', v_deal_type));

    if coalesce(v_deal_type, 'pickup') <> 'swap' then
      update public.profiles
      set completed_sales_count = completed_sales_count + 1
      where id = v_seller
      returning completed_sales_count into v_sales;

      if v_sales > 0 and (v_sales % 5) = 0 then
        insert into public.notifications (user_id, type, listing_id, payload)
        values (
          v_seller,
          'seller_reward',
          p_listing_id,
          jsonb_build_object('completed_sales', v_sales, 'rate', 5)
        );
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'completed', v_completed);
end $$;

revoke all on function public.user_has_premium(uuid) from public;
grant execute on function public.user_has_premium(uuid) to authenticated;
revoke all on function public.free_swaps_remaining(uuid) from public;
grant execute on function public.free_swaps_remaining(uuid) to authenticated;
revoke all on function public.can_user_swap(uuid) from public;
grant execute on function public.can_user_swap(uuid) to authenticated;

commit;
