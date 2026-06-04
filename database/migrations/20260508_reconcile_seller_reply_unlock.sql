-- Fix stuck pending unlocks when the seller already replied but accept-on-first-message did not run
-- (e.g. messages predating the trigger, or a missed trigger). Safe to call repeatedly.

begin;

create or replace function public.reconcile_unlock_accept_after_seller_reply(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_req_id uuid;
  v_cost int;
  v_status text;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = p_listing_id and u.buyer_id = v_buyer
  ) then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  select r.id, r.credits_held, r.status
  into v_req_id, v_cost, v_status
  from public.listing_unlock_requests r
  where r.listing_id = p_listing_id
    and r.buyer_id = v_buyer
    and r.status = 'pending'
  order by r.created_at desc
  limit 1;

  if v_req_id is null then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'no_pending_request');
  end if;

  if (select expires_at <= now() from public.listing_unlock_requests where id = v_req_id) then
    update public.listing_unlock_requests
    set status = 'expired', decided_at = now()
    where id = v_req_id;
    perform set_config('app.allow_profile_credit_write', '1', true);
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    return jsonb_build_object('ok', true, 'expired', true);
  end if;

  select l.user_id into v_seller
  from public.listings l
  where l.id = p_listing_id;

  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  if not exists (
    select 1
    from public.listing_messages m
    where m.listing_id = p_listing_id
      and m.sender_id = v_seller
  ) then
    return jsonb_build_object('ok', true, 'noop', true, 'reason', 'seller_has_not_replied');
  end if;

  if exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = p_listing_id and u.buyer_id <> v_buyer
  ) then
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where id = v_req_id;
    perform set_config('app.allow_profile_credit_write', '1', true);
    update public.profiles
    set held_credits = greatest(0, held_credits - v_cost)
    where id = v_buyer;
    return jsonb_build_object('ok', false, 'error', 'already_taken');
  end if;

  perform set_config('app.allow_profile_credit_write', '1', true);

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = v_req_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, p_listing_id, v_cost, 'pickup', now());

  update public.profiles p
  set credit_balance = p.credit_balance - v_cost,
      held_credits = greatest(0, p.held_credits - v_cost)
  where p.id = v_buyer;

  with other as (
    select id, buyer_id, credits_held
    from public.listing_unlock_requests
    where listing_id = p_listing_id and status = 'pending' and id <> v_req_id
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
    where listing_id = p_listing_id
      and status = 'declined'
      and decided_at >= now() - interval '5 seconds'
    group by buyer_id
  ) x
  where p.id = x.buyer_id;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', p_listing_id, jsonb_build_object('credits', v_cost));

  return jsonb_build_object('ok', true, 'accepted', true, 'credits_spent', v_cost);
end $$;

revoke all on function public.reconcile_unlock_accept_after_seller_reply(uuid) from public;
grant execute on function public.reconcile_unlock_accept_after_seller_reply(uuid) to authenticated;

commit;
