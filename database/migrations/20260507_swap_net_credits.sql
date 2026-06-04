-- Swap fairness: on accept, refund credit difference (seller listing credits minus offered listing credits).
-- On swap completion, archive the buyer's offered listing as well as the seller listing.

begin;

alter table public.listing_unlocks
  add column if not exists swap_credits_refunded smallint not null default 0;

comment on column public.listing_unlocks.swap_credits_refunded is
  'Credits returned to buyer when seller accepted a swap (difference between unlock cost and net swap cost).';

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
  v_spent int;
  v_seller_cost int;
  v_offered_cost int := 1;
  v_net int;
  v_refund int;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_seller) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select l.title,
    case when l.unlock_credits = 2 then 2 else 1 end
  into v_listing_title, v_seller_cost
  from public.listings l
  where l.id = p_listing_id;

  if p_accept then
    perform set_config('app.allow_profile_credit_write', '1', true);
  end if;

  if p_accept then
    for r in
      select u.buyer_id, u.offered_listing_id, coalesce(u.credits_spent, 1) as credits_spent
      from public.listing_unlocks u
      where u.listing_id = p_listing_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed'
      for update
    loop
      v_any := true;
      v_offered_title := null;
      v_offered_cost := 1;
      v_spent := r.credits_spent;
      if r.offered_listing_id is not null then
        select ol.title,
          case when ol.unlock_credits = 2 then 2 else 1 end
        into v_offered_title, v_offered_cost
        from public.listings ol
        where ol.id = r.offered_listing_id;
      end if;

      -- Net can be 0 (requires credits_spent check 0–2; see 20260509_swap_allow_zero_net_credits.sql).
      v_net := greatest(v_seller_cost - v_offered_cost, 0);
      v_refund := greatest(v_spent - v_net, 0);

      if v_refund > 0 then
        update public.profiles
        set credit_balance = credit_balance + v_refund
        where id = r.buyer_id;
      end if;

      update public.listing_unlocks u
      set swap_status = 'accepted',
          credits_spent = v_net,
          swap_credits_refunded = v_refund
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
          'offered_listing_id', r.offered_listing_id,
          'seller_credits', v_seller_cost,
          'offered_credits', v_offered_cost,
          'net_credits', v_net,
          'credits_refunded', v_refund
        )
      );
    end loop;
  else
    for r in
      select buyer_id, offered_listing_id
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
      set swap_status = 'declined',
          deal_type = 'pickup',
          offered_listing_id = null
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
  v_credits int := 1;
  v_row_count int := 0;
  v_completed boolean := false;
  v_sales int := 0;
  v_deal_type text;
  v_offered_id uuid;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.buyer_id,
    l.user_id,
    coalesce(u.credits_spent, 1),
    coalesce(u.deal_type, 'pickup'),
    u.offered_listing_id
  into v_buyer, v_seller, v_credits, v_deal_type, v_offered_id
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

    update public.profiles
    set completed_sales_count = completed_sales_count + 1
    where id = v_seller
    returning completed_sales_count into v_sales;

    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_buyer,
      'deal_completed',
      p_listing_id,
      jsonb_build_object('credits_spent', v_credits)
    );

    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_seller,
      'deal_completed',
      p_listing_id,
      jsonb_build_object('credits_earned', v_credits)
    );

    if v_sales > 0 and (v_sales % 5) = 0 then
      update public.profiles
      set credit_balance = credit_balance + 1,
          reward_credits_earned = reward_credits_earned + 1
      where id = v_seller;

      insert into public.notifications (user_id, type, listing_id, payload)
      values (
        v_seller,
        'seller_reward',
        p_listing_id,
        jsonb_build_object('earned', 1, 'completed_sales', v_sales, 'rate', 5)
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'completed', v_completed);
end $$;

revoke all on function public.respond_swap(uuid, boolean) from public;
grant execute on function public.respond_swap(uuid, boolean) to authenticated;

revoke all on function public.confirm_deal_complete(uuid) from public;
grant execute on function public.confirm_deal_complete(uuid) to authenticated;

commit;
