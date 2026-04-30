-- Fix 24h unlock expiry: the previous expire_my_unlock_requests() referenced CTE "exp"
-- in a second statement where it is out of scope, so held_credits was not reliably released.
-- Also add expire_listing_unlock_requests() so the *seller* viewing a listing can release
-- expired holds (buyer-only expire meant holds could stick until the buyer returned).

begin;

-- Expire the current user's pending requests that are past expires_at; release held_credits.
create or replace function public.expire_my_unlock_requests(p_listing_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_count int := 0;
  v_release int := 0;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if v_buyer is null then
    return 0;
  end if;

  with exp as (
    select id, credits_held
    from public.listing_unlock_requests
    where buyer_id = v_buyer
      and status = 'pending'
      and expires_at <= now()
      and (p_listing_id is null or listing_id = p_listing_id)
  ),
  rel as (
    select coalesce(sum(credits_held), 0)::int as total
    from exp
  ),
  upd as (
    update public.listing_unlock_requests r
    set status = 'expired', decided_at = now()
    from exp
    where r.id = exp.id
    returning 1
  )
  select
    (select count(*)::int from upd),
    (select total from rel)
  into v_count, v_release;

  if v_count > 0 and v_release > 0 then
    update public.profiles
    set held_credits = greatest(0, held_credits - v_release)
    where id = v_buyer;
  end if;

  return v_count;
end $$;

-- Expire all pending requests for one listing that are past expires_at; release each buyer's hold.
-- Callable by any authenticated user (idempotent; only rows with expires_at <= now() are touched).
create or replace function public.expire_listing_unlock_requests(p_listing_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int := 0;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);
  if auth.uid() is null then
    return 0;
  end if;

  if not exists (select 1 from public.listings l where l.id = p_listing_id) then
    return 0;
  end if;

  -- Single statement so all CTEs share scope; profile releases match expired rows.
  with exp as (
    select id, buyer_id, credits_held
    from public.listing_unlock_requests
    where listing_id = p_listing_id
      and status = 'pending'
      and expires_at <= now()
  ),
  agg as (
    select buyer_id, sum(credits_held)::int as rel
    from exp
    group by buyer_id
  ),
  upd as (
    update public.listing_unlock_requests r
    set status = 'expired', decided_at = now()
    from exp
    where r.id = exp.id
    returning r.id
  ),
  prof as (
    update public.profiles p
    set held_credits = greatest(0, p.held_credits - a.rel)
    from agg a
    where p.id = a.buyer_id
    returning p.id
  )
  select (select count(*)::int from upd) into v_n;

  return coalesce(v_n, 0);
end $$;

revoke all on function public.expire_listing_unlock_requests(uuid) from public;
grant execute on function public.expire_listing_unlock_requests(uuid) to authenticated;

commit;
