-- Seller reward (1 credit per 5 deals) counts pickup completions only, not swaps.

begin;

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

    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_buyer,
      'deal_completed',
      p_listing_id,
      jsonb_build_object('credits_spent', v_credits, 'deal_type', v_deal_type)
    );

    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_seller,
      'deal_completed',
      p_listing_id,
      jsonb_build_object('credits_earned', v_credits, 'deal_type', v_deal_type)
    );

    -- Reward progress: pickup / credit unlock sales only (not swaps).
    if coalesce(v_deal_type, 'pickup') <> 'swap' then
      update public.profiles
      set completed_sales_count = completed_sales_count + 1
      where id = v_seller
      returning completed_sales_count into v_sales;

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
  end if;

  return jsonb_build_object('ok', true, 'completed', v_completed);
end $$;

revoke all on function public.confirm_deal_complete(uuid) from public;
grant execute on function public.confirm_deal_complete(uuid) to authenticated;

commit;
