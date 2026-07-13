-- Launch mode: full app access without Premium. Karma counts from completed handoffs.
-- Restore subscription checks in user_has_premium when Premium perks launch.

begin;

alter table public.profiles
  add column if not exists completed_pickups_count int not null default 0,
  add column if not exists completed_swaps_count int not null default 0;

alter table public.profiles
  drop constraint if exists profiles_completed_pickups_count_nonnegative;
alter table public.profiles
  add constraint profiles_completed_pickups_count_nonnegative
  check (completed_pickups_count >= 0);

alter table public.profiles
  drop constraint if exists profiles_completed_swaps_count_nonnegative;
alter table public.profiles
  add constraint profiles_completed_swaps_count_nonnegative
  check (completed_swaps_count >= 0);

comment on column public.profiles.completed_pickups_count is
  'Completed pickup deals as buyer (both parties confirmed handoff).';
comment on column public.profiles.completed_swaps_count is
  'Completed swap deals (both parties confirmed handoff).';

-- Launch: treat everyone as having full access (messaging + unlimited swaps).
create or replace function public.user_has_premium(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Launch mode — flip to subscription check when Premium perks go live.
  return true;
end $$;

create or replace function public.can_user_swap(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true, 'premium', true, 'free_remaining', 999);
end $$;

create or replace function public.request_unlock_hold(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
begin
  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
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

  if exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = p_listing_id and u.buyer_id = v_buyer
  ) then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, p_listing_id, 0, 'pickup', now())
  on conflict (buyer_id, listing_id) do nothing;

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where buyer_id = v_buyer and listing_id = p_listing_id and status = 'pending';

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_seller, 'unlock_request', p_listing_id, jsonb_build_object('buyer_id', v_buyer));

  return jsonb_build_object('ok', true, 'unlocked', true);
end $$;

-- Karma: increment buyer/seller stats when both confirm handoff.
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
    and u.completed_at is null
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

    if coalesce(v_deal_type, 'pickup') = 'swap' then
      update public.profiles
      set completed_swaps_count = completed_swaps_count + 1
      where id in (v_buyer, v_seller);
    else
      update public.profiles
      set completed_pickups_count = completed_pickups_count + 1
      where id = v_buyer;

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

drop function if exists public.profiles_public_batch(uuid[]);

create or replace function public.profiles_public_batch(p_user_ids uuid[])
returns table(
  id uuid,
  display_name text,
  avatar_url text,
  completed_pickups_count int,
  completed_sales_count int,
  completed_swaps_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce(p.completed_pickups_count, 0),
    coalesce(p.completed_sales_count, 0),
    coalesce(p.completed_swaps_count, 0)
  from public.profiles p
  where p.id = any(p_user_ids);
$$;

revoke all on function public.profiles_public_batch(uuid[]) from public;
grant execute on function public.profiles_public_batch(uuid[]) to authenticated, anon;

comment on function public.profiles_public_batch(uuid[]) is
  'Public-safe profile fields plus karma exchange counts for trust badges.';

commit;
