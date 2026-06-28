-- Marketplace-style chat: unlimited Premium buyers per listing, private threads per buyer.
-- Instant unlock on request (no FIFO / already_taken blocking).

begin;

-- ---------------------------------------------------------------------------
-- Per-buyer message threads (seller ↔ buyer), not one shared listing thread.
-- ---------------------------------------------------------------------------
alter table public.listing_messages
  add column if not exists thread_buyer_id uuid references public.profiles (id) on delete cascade;

update public.listing_messages m
set thread_buyer_id = case
  when m.sender_id = l.user_id then (
    select u.buyer_id
    from public.listing_unlocks u
    where u.listing_id = m.listing_id
    order by u.created_at asc
    limit 1
  )
  else m.sender_id
end
from public.listings l
where l.id = m.listing_id
  and m.thread_buyer_id is null;

update public.listing_messages m
set thread_buyer_id = m.sender_id
where m.thread_buyer_id is null;

alter table public.listing_messages
  alter column thread_buyer_id set not null;

create index if not exists listing_messages_listing_thread_created_idx
  on public.listing_messages (listing_id, thread_buyer_id, created_at asc);

comment on column public.listing_messages.thread_buyer_id is
  'Buyer participant for this 1:1 thread (seller messages use the buyer they are replying to).';

-- ---------------------------------------------------------------------------
-- RLS: buyers only see their thread; sellers see all threads on their listing.
-- ---------------------------------------------------------------------------
drop policy if exists "listing_messages_select_participants" on public.listing_messages;
create policy "listing_messages_select_participants"
on public.listing_messages
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_messages.listing_id and l.user_id = auth.uid()
  )
  or listing_messages.thread_buyer_id = auth.uid()
);

drop policy if exists "listing_messages_insert_participants" on public.listing_messages;
create policy "listing_messages_insert_participants"
on public.listing_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    exists (
      select 1 from public.listings l
      where l.id = listing_messages.listing_id and l.user_id = auth.uid()
    )
    or (
      listing_messages.thread_buyer_id = auth.uid()
      and exists (
        select 1 from public.listing_unlocks u
        where u.listing_id = listing_messages.listing_id and u.buyer_id = auth.uid()
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- Premium: instant unlock — any number of buyers can chat on one listing.
-- ---------------------------------------------------------------------------
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

  if not public.user_has_premium(v_buyer) then
    return jsonb_build_object('ok', false, 'error', 'premium_required');
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

-- ---------------------------------------------------------------------------
-- Accept/decline one buyer without affecting others.
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

  update public.listing_unlock_requests
  set status = 'accepted', decided_at = now()
  where id = p_request_id;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent, deal_type, balance_captured_at)
  values (v_buyer, v_listing, 0, 'pickup', now())
  on conflict (buyer_id, listing_id) do nothing;

  insert into public.notifications (user_id, type, listing_id, payload)
  values (v_buyer, 'unlock_accepted', v_listing, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'accepted', true);
end $$;

-- ---------------------------------------------------------------------------
-- Seller reply no longer auto-declines other buyers (FIFO removed).
-- ---------------------------------------------------------------------------
create or replace function public.capture_unlock_credits_on_seller_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_buyer uuid;
begin
  select l.user_id into v_seller from public.listings l where l.id = new.listing_id;
  if v_seller is null or new.sender_id <> v_seller then
    return new;
  end if;

  v_buyer := new.thread_buyer_id;

  if v_buyer is null then
    return new;
  end if;

  update public.listing_unlocks u
  set balance_captured_at = coalesce(u.balance_captured_at, now()),
      credits_spent = 0
  where u.listing_id = new.listing_id
    and u.buyer_id = v_buyer
    and u.balance_captured_at is null;

  return new;
end $$;

-- ---------------------------------------------------------------------------
-- post_listing_message: thread-aware (seller must specify buyer thread).
-- ---------------------------------------------------------------------------
create or replace function public.post_listing_message(
  p_listing_id uuid,
  p_body text,
  p_image_url text default null,
  p_thread_buyer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trimmed text;
  v_image text;
  v_display text;
  v_is_seller boolean;
  v_thread uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_trimmed := trim(coalesce(p_body, ''));
  v_image := nullif(btrim(coalesce(p_image_url, '')), '');

  if length(v_trimmed) = 0 and v_image is null then
    return jsonb_build_object('ok', false, 'error', 'empty_body');
  end if;
  if length(v_trimmed) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'too_long');
  end if;

  if v_image is not null then
    if not (
      v_image ~ ('^https?://.+/storage/v1/object/public/listing-photos/' || v_uid::text || '/')
    ) then
      return jsonb_build_object('ok', false, 'error', 'bad_image_url');
    end if;
  end if;

  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.user_id = v_uid
  ) into v_is_seller;

  if v_is_seller then
    if p_thread_buyer_id is null then
      return jsonb_build_object('ok', false, 'error', 'thread_required');
    end if;
    if not exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = p_listing_id and u.buyer_id = p_thread_buyer_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'bad_thread');
    end if;
    v_thread := p_thread_buyer_id;
  else
    if not exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = p_listing_id and u.buyer_id = v_uid
    ) then
      return jsonb_build_object('ok', false, 'error', 'not_participant');
    end if;
    v_thread := v_uid;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Member') into v_display
  from public.profiles
  where id = v_uid;

  if v_display is null then
    v_display := 'Member';
  end if;

  insert into public.listing_messages (
    listing_id,
    sender_id,
    sender_display_name,
    body,
    image_url,
    thread_buyer_id
  )
  values (p_listing_id, v_uid, v_display, v_trimmed, v_image, v_thread);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.post_listing_message(uuid, text, text, uuid) from public;
grant execute on function public.post_listing_message(uuid, text, text, uuid) to authenticated;

commit;
