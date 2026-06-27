-- When a listing is archived or deleted, decline pending unlock requests,
-- release any held credits, and notify buyers so Messages/Activity stay accurate.

begin;

-- ---------------------------------------------------------------------------
-- Shared: notify pending requesters and active (incomplete) unlock buyers.
-- ---------------------------------------------------------------------------
create or replace function public._notify_listing_unavailable_to_buyers(
  p_listing_id uuid,
  p_listing_title text,
  p_notification_type text,
  p_exclude_buyer_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, listing_id, payload)
  select distinct r.buyer_id,
    p_notification_type,
    p_listing_id,
    jsonb_build_object('listing_title', coalesce(p_listing_title, 'this book'))
  from public.listing_unlock_requests r
  where r.listing_id = p_listing_id
    and r.status = 'pending'
    and (p_exclude_buyer_id is null or r.buyer_id <> p_exclude_buyer_id);

  insert into public.notifications (user_id, type, listing_id, payload)
  select u.buyer_id,
    p_notification_type,
    p_listing_id,
    jsonb_build_object('listing_title', coalesce(p_listing_title, 'this book'))
  from public.listing_unlocks u
  where u.listing_id = p_listing_id
    and u.completed_at is null
    and (p_exclude_buyer_id is null or u.buyer_id <> p_exclude_buyer_id);
end $$;

-- ---------------------------------------------------------------------------
-- Decline pending requests on a listing and release held credits.
-- ---------------------------------------------------------------------------
create or replace function public._decline_pending_unlock_requests(p_listing_id uuid, p_final_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_profile_credit_write', '1', true);

  with pending as (
    select id, buyer_id, credits_held
    from public.listing_unlock_requests
    where listing_id = p_listing_id and status = 'pending'
  ),
  rel as (
    select buyer_id, sum(credits_held)::int as total
    from pending
    group by buyer_id
  ),
  upd as (
    update public.listing_unlock_requests r
    set status = p_final_status, decided_at = now()
    from pending p
    where r.id = p.id
    returning r.id
  )
  update public.profiles pr
  set held_credits = greatest(0, pr.held_credits - rel.total)
  from rel
  where pr.id = rel.buyer_id and rel.total > 0;
end $$;

-- ---------------------------------------------------------------------------
-- Archive: notify non-winning buyers; deal winner already gets deal_completed.
-- ---------------------------------------------------------------------------
create or replace function public.on_listing_archived_notify_buyers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner uuid;
begin
  if tg_op <> 'UPDATE' or old.status <> 'active' or new.status <> 'archived' then
    return new;
  end if;

  select u.buyer_id into v_winner
  from public.listing_unlocks u
  where u.listing_id = new.id and u.completed_at is not null
  order by u.completed_at desc
  limit 1;

  perform public._notify_listing_unavailable_to_buyers(
    new.id, new.title, 'listing_sold', v_winner
  );
  perform public._decline_pending_unlock_requests(new.id, 'declined');

  return new;
end $$;

drop trigger if exists trg_listings_archived_notify_buyers on public.listings;
create trigger trg_listings_archived_notify_buyers
after update of status on public.listings
for each row execute function public.on_listing_archived_notify_buyers();

-- ---------------------------------------------------------------------------
-- Hard delete: notify everyone with interest before cascade removes rows.
-- ---------------------------------------------------------------------------
create or replace function public.on_listing_deleted_notify_buyers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._notify_listing_unavailable_to_buyers(
    old.id, old.title, 'listing_removed', null
  );
  perform public._decline_pending_unlock_requests(old.id, 'cancelled');

  return old;
end $$;

drop trigger if exists trg_listings_deleted_notify_buyers on public.listings;
create trigger trg_listings_deleted_notify_buyers
before delete on public.listings
for each row execute function public.on_listing_deleted_notify_buyers();

-- ---------------------------------------------------------------------------
-- When one buyer wins, notify others their request was not chosen (listing still active).
-- ---------------------------------------------------------------------------
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

  with declined as (
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where listing_id = v_listing and status = 'pending' and id <> p_request_id
    returning buyer_id
  )
  insert into public.notifications (user_id, type, listing_id, payload)
  select d.buyer_id, 'unlock_declined', v_listing, '{}'::jsonb
  from declined d;

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

  with declined as (
    update public.listing_unlock_requests
    set status = 'declined', decided_at = now()
    where listing_id = new.listing_id and status = 'pending' and id <> v_req_id
    returning buyer_id
  )
  insert into public.notifications (user_id, type, listing_id, payload)
  select d.buyer_id, 'unlock_declined', new.listing_id, '{}'::jsonb
  from declined d;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', new.listing_id, '{}'::jsonb);

  return new;
end $$;

commit;
