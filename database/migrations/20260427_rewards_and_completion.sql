-- Seller rewards + completion side-effects.
-- - Tracks completed sales count on profiles.
-- - Awards +1 credit per 5 completed sales (only after both-party completion confirm).
-- - Archives the listing when the deal completes.
-- - Adds in-app notifications for deal completion and reward earned.

begin;

alter table public.profiles
  add column if not exists completed_sales_count int not null default 0,
  add column if not exists reward_credits_earned int not null default 0;

alter table public.profiles
  drop constraint if exists profiles_completed_sales_count_nonnegative;
alter table public.profiles
  add constraint profiles_completed_sales_count_nonnegative check (completed_sales_count >= 0);

alter table public.profiles
  drop constraint if exists profiles_reward_credits_earned_nonnegative;
alter table public.profiles
  add constraint profiles_reward_credits_earned_nonnegative check (reward_credits_earned >= 0);

comment on column public.profiles.completed_sales_count is
  'Count of completed deals as a seller (both parties confirmed completion).';
comment on column public.profiles.reward_credits_earned is
  'Credits granted by the seller reward program (1 credit per 5 completed sales).';

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
  v_completed boolean := false;
  v_sales int := 0;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.buyer_id, l.user_id, coalesce(u.credits_spent, 1)
  into v_buyer, v_seller, v_credits
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

  -- Only the first time both parties have confirmed should we mark completion and award rewards.
  update public.listing_unlocks
  set completed_at = now()
  where listing_id = p_listing_id and buyer_id = v_buyer
    and completed_at is null
    and buyer_confirmed_at is not null
    and seller_confirmed_at is not null;

  get diagnostics v_completed = row_count > 0;

  if v_completed then
    -- Archive the listing so it no longer appears in active feeds/search.
    update public.listings
    set status = 'archived'
    where id = p_listing_id and status = 'active';

    -- Seller reward: +1 credit for every 5 completed sales.
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

revoke all on function public.confirm_deal_complete(uuid) from public;
grant execute on function public.confirm_deal_complete(uuid) to authenticated;

commit;

