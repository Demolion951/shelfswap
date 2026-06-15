-- Refund buyer when closing a stalled deal (seller inactive 14+ days).
-- Also release held credits on withdraw when seller never replied and credits were not yet captured.
-- Location: database/migrations/20260517_buyer_stalled_seller_refund.sql

begin;

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
  v_hold_released boolean := false;
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

  perform set_config('app.allow_profile_credit_write', '1', true);

  if v_unlock.balance_captured_at is null and v_unlock.credits_spent > 0 then
    update public.profiles
    set held_credits = greatest(0, held_credits - v_unlock.credits_spent)
    where id = v_buyer;
    v_hold_released := true;
  elsif v_unlock.balance_captured_at is not null and v_unlock.credits_spent > 0 then
    v_refund := true;
  end if;

  perform public._terminate_listing_unlock(p_listing_id, v_buyer, v_refund);

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_seller,
    'deal_withdrawn',
    p_listing_id,
    jsonb_build_object(
      'refunded', v_refund,
      'hold_released', v_hold_released,
      'credits', v_unlock.credits_spent
    )
  );

  return jsonb_build_object(
    'ok', true,
    'refunded', v_refund,
    'hold_released', v_hold_released,
    'credits', v_unlock.credits_spent
  );
end;
$$;

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
  v_credits int := 0;
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

  select u.completed_at, coalesce(u.credits_spent, 0) as credits_spent
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

  if not exists (
    select 1 from public.listing_messages m
    where m.listing_id = p_listing_id and m.sender_id = v_buyer
  ) then
    return jsonb_build_object('ok', false, 'error', 'buyer_has_not_messaged');
  end if;

  select max(m.created_at) into v_last_seller_msg
  from public.listing_messages m
  where m.listing_id = p_listing_id and m.sender_id = v_seller;

  if v_last_seller_msg is null or v_last_seller_msg > now() - interval '14 days' then
    return jsonb_build_object('ok', false, 'error', 'seller_still_active');
  end if;

  v_credits := v_unlock.credits_spent;

  perform public._terminate_listing_unlock(p_listing_id, v_buyer, true);

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_seller,
    'deal_buyer_closed',
    p_listing_id,
    jsonb_build_object('refunded', true, 'credits', v_credits)
  );

  insert into public.notifications (user_id, type, listing_id, payload)
  values (
    v_buyer,
    'deal_buyer_closed',
    p_listing_id,
    jsonb_build_object('refunded', true, 'credits', v_credits)
  );

  return jsonb_build_object('ok', true, 'refunded', true, 'credits', v_credits);
end;
$$;

revoke all on function public.withdraw_from_deal(uuid) from public;
grant execute on function public.withdraw_from_deal(uuid) to authenticated;

revoke all on function public.buyer_close_stalled_deal(uuid) from public;
grant execute on function public.buyer_close_stalled_deal(uuid) to authenticated;

commit;
