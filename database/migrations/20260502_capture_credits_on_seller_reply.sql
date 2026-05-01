-- Defer credit debit until the seller sends their first message on the thread (fairness).
-- Unlock accept: create listing_unlocks + keep buyer held credits until capture (no balance debit yet).
-- Existing rows: treat as already captured so no retroactive charge.

begin;

alter table public.listing_unlocks
  add column if not exists balance_captured_at timestamptz;

comment on column public.listing_unlocks.balance_captured_at is
  'When credits were debited from the buyer balance (first seller message after unlock). Null = pending.';

-- Historical unlocks already charged at accept time in prior app versions.
update public.listing_unlocks
set balance_captured_at = coalesce(balance_captured_at, created_at)
where balance_captured_at is null;

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

  if exists (select 1 from public.listing_unlocks u where u.listing_id = v_listing and u.buyer_id <> v_buyer) then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = p_request_id;
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
  end if;

  -- Accept: unlock chat; keep held credits until seller’s first message captures the debit.
  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = p_request_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, v_listing, v_cost, 'pickup', null)
  on conflict (buyer_id, listing_id) do nothing;

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
begin
  select l.user_id into v_seller from public.listings l where l.id = new.listing_id;
  if v_seller is null or new.sender_id <> v_seller then
    return new;
  end if;

  select u.buyer_id, u.credits_spent into v_buyer, v_cost
  from public.listing_unlocks u
  where u.listing_id = new.listing_id
    and u.balance_captured_at is null
  limit 1;

  if v_buyer is null then
    return new;
  end if;

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
end $$;

drop trigger if exists tr_capture_unlock_on_seller_msg on public.listing_messages;
create trigger tr_capture_unlock_on_seller_msg
  after insert on public.listing_messages
  for each row
  execute function public.capture_unlock_credits_on_seller_message();

commit;
