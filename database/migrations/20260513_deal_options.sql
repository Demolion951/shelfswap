-- Deal options: buyer withdraw, mutual cancel (no refund), stalled-deal exits, no refund on mutual/stalled.
-- Location: database/migrations/20260513_deal_options.sql

begin;

alter table public.listing_unlocks
  add column if not exists buyer_mutual_cancel_at timestamptz,
  add column if not exists seller_mutual_cancel_at timestamptz;

comment on column public.listing_unlocks.buyer_mutual_cancel_at is
  'Buyer agreed to mutual cancel; deal closes when seller also agrees (no credit refund).';
comment on column public.listing_unlocks.seller_mutual_cancel_at is
  'Seller agreed to mutual cancel; deal closes when buyer also agrees (no credit refund).';

-- Shared: end an active unlock row and optionally refund net credits_spent to buyer.
create or replace function public._terminate_listing_unlock(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_refund boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spent int;
  v_row record;
begin
  select u.id, coalesce(u.credits_spent, 0) as credits_spent
  into v_row
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
    and u.buyer_id = p_buyer_id
    and u.completed_at is null
  for update;

  if not found then
    return;
  end if;

  v_spent := v_row.credits_spent;

  if p_refund and v_spent > 0 then
    perform set_config('app.allow_profile_credit_write', '1', true);
    update public.profiles
    set credit_balance = credit_balance + v_spent
    where id = p_buyer_id;
  end if;

  delete from public.listing_unlocks
  where id = v_row.id;

  update public.listings
  set status = 'active'
  where id = p_listing_id
    and status = 'active';
end;
$$;

-- Buyer withdraw: seller never replied, within 48h. Refund if credits were captured.
create or replace function public.withdraw_from_deal(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_unlock record;
  v_refund boolean := false;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select l.user_id into v_seller
  from public.listings l
  where l.id = p_listing_id;

  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  select u.id, u.created_at, u.completed_at, u.balance_captured_at, coalesce(u.credits_spent, 0) as credits_spent
  into v_unlock
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
    and u.buyer_id = v_buyer
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_active_deal');
  end if;

  if v_unlock.completed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  if exists (
    select 1 from public.listing_messages m
    where m.listing_id = p_listing_id and m.sender_id = v_seller
  ) then
    return jsonb_build_object('ok', false, 'error', 'seller_has_replied');
  end if;

  if v_unlock.created_at < now() - interval '48 hours' then
    return jsonb_build_object('ok', false, 'error', 'withdraw_window_expired');
  end if;

  v_refund := v_unlock.balance_captured_at is not null and v_unlock.credits_spent > 0;

  perform public._terminate_listing_unlock(p_listing_id, v_buyer, v_refund);

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_seller,
    'deal_withdrawn',
    p_listing_id,
    jsonb_build_object('refunded', v_refund, 'credits', v_unlock.credits_spent)
  );

  return jsonb_build_object('ok', true, 'refunded', v_refund, 'credits', v_unlock.credits_spent);
end;
$$;

-- Either party requests mutual cancel; completes when both agree. No credit refund.
create or replace function public.request_mutual_cancel(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_unlock record;
  v_is_buyer boolean;
  v_is_seller boolean;
  v_both boolean;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select l.user_id into v_seller
  from public.listings l
  where l.id = p_listing_id;

  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  select u.buyer_id, u.completed_at, u.buyer_mutual_cancel_at, u.seller_mutual_cancel_at
  into v_unlock
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_active_deal');
  end if;

  if v_unlock.completed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  v_is_buyer := v_user = v_unlock.buyer_id;
  v_is_seller := v_user = v_seller;

  if not v_is_buyer and not v_is_seller then
    return jsonb_build_object('ok', false, 'error', 'not_participant');
  end if;

  if v_is_buyer then
    update public.listing_unlocks
    set buyer_mutual_cancel_at = coalesce(buyer_mutual_cancel_at, now())
    where listing_id = p_listing_id;
  else
    update public.listing_unlocks
    set seller_mutual_cancel_at = coalesce(seller_mutual_cancel_at, now())
    where listing_id = p_listing_id;
  end if;

  select buyer_mutual_cancel_at, seller_mutual_cancel_at
  into v_unlock.buyer_mutual_cancel_at, v_unlock.seller_mutual_cancel_at
  from public.listing_unlocks
  where listing_id = p_listing_id;

  v_both := v_unlock.buyer_mutual_cancel_at is not null
    and v_unlock.seller_mutual_cancel_at is not null;

  if v_both then
    perform public._terminate_listing_unlock(p_listing_id, v_unlock.buyer_id, false);

    insert into public.notifications (user_id, type, listing_id, payload)
    values
      (v_unlock.buyer_id, 'deal_mutual_cancel', p_listing_id, jsonb_build_object('refunded', false)),
      (v_seller, 'deal_mutual_cancel', p_listing_id, jsonb_build_object('refunded', false));

    return jsonb_build_object('ok', true, 'completed', true, 'refunded', false);
  end if;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    case when v_is_buyer then v_seller else v_unlock.buyer_id end,
    'deal_cancel_requested',
    p_listing_id,
    jsonb_build_object('by', case when v_is_buyer then 'buyer' else 'seller' end)
  );

  return jsonb_build_object('ok', true, 'completed', false, 'waiting_for_other', true);
end;
$$;

-- Seller re-lists when buyer has been inactive 14+ days (seller must have replied at least once).
create or replace function public.seller_relist_stalled_deal(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v_unlock record;
  v_last_buyer_msg timestamptz;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not exists (
    select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_seller
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select u.buyer_id, u.completed_at
  into v_unlock
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_active_deal');
  end if;

  if v_unlock.completed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  if not exists (
    select 1 from public.listing_messages m
    where m.listing_id = p_listing_id and m.sender_id = v_seller
  ) then
    return jsonb_build_object('ok', false, 'error', 'seller_has_not_replied');
  end if;

  select max(m.created_at) into v_last_buyer_msg
  from public.listing_messages m
  where m.listing_id = p_listing_id and m.sender_id = v_unlock.buyer_id;

  if v_last_buyer_msg is not null then
    if v_last_buyer_msg > now() - interval '14 days' then
      return jsonb_build_object('ok', false, 'error', 'buyer_still_active');
    end if;
  elsif (
    select u.created_at from public.listing_unlocks u where u.listing_id = p_listing_id
  ) > now() - interval '14 days' then
    return jsonb_build_object('ok', false, 'error', 'buyer_still_active');
  end if;

  perform public._terminate_listing_unlock(p_listing_id, v_unlock.buyer_id, false);

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_unlock.buyer_id,
    'deal_seller_relisted',
    p_listing_id,
    jsonb_build_object('refunded', false)
  );

  return jsonb_build_object('ok', true, 'refunded', false);
end;
$$;

-- Buyer closes deal when seller inactive 14+ days (seller must have replied before).
create or replace function public.buyer_close_stalled_deal(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_unlock record;
  v_last_seller_msg timestamptz;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select l.user_id into v_seller
  from public.listings l
  where l.id = p_listing_id;

  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  select u.completed_at
  into v_unlock
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
    and u.buyer_id = v_buyer
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_active_deal');
  end if;

  if v_unlock.completed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  if not exists (
    select 1 from public.listing_messages m
    where m.listing_id = p_listing_id and m.sender_id = v_seller
  ) then
    return jsonb_build_object('ok', false, 'error', 'use_withdraw_instead');
  end if;

  select max(m.created_at) into v_last_seller_msg
  from public.listing_messages m
  where m.listing_id = p_listing_id and m.sender_id = v_seller;

  if v_last_seller_msg is null or v_last_seller_msg > now() - interval '14 days' then
    return jsonb_build_object('ok', false, 'error', 'seller_still_active');
  end if;

  perform public._terminate_listing_unlock(p_listing_id, v_buyer, false);

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_seller,
    'deal_buyer_closed',
    p_listing_id,
    jsonb_build_object('refunded', false)
  );

  return jsonb_build_object('ok', true, 'refunded', false);
end;
$$;

revoke all on function public._terminate_listing_unlock(uuid, uuid, boolean) from public;
grant execute on function public.withdraw_from_deal(uuid) to authenticated;
grant execute on function public.request_mutual_cancel(uuid) to authenticated;
grant execute on function public.seller_relist_stalled_deal(uuid) to authenticated;
grant execute on function public.buyer_close_stalled_deal(uuid) to authenticated;

commit;
