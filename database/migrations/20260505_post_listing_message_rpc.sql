-- Reliable messaging for sellers, unlocked buyers, and buyers with a pending unlock request.
-- Inserts via security definer so posting works even if listing_messages RLS drifted; policies refreshed below.

begin;

-- ---------------------------------------------------------------------------
-- listing_messages: pending buyer participant (same as 20260503)
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
  or exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = listing_messages.listing_id and u.buyer_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_unlock_requests r
    where r.listing_id = listing_messages.listing_id
      and r.buyer_id = auth.uid()
      and r.status = 'pending'
  )
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
    or exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = listing_messages.listing_id and u.buyer_id = auth.uid()
    )
    or exists (
      select 1 from public.listing_unlock_requests r
      where r.listing_id = listing_messages.listing_id
        and r.buyer_id = auth.uid()
        and r.status = 'pending'
    )
  )
);

-- ---------------------------------------------------------------------------
-- listing_pickup: pending buyer can read
-- ---------------------------------------------------------------------------
drop policy if exists "listing_pickup_select_participants" on public.listing_pickup;
create policy "listing_pickup_select_participants"
on public.listing_pickup
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_pickup.listing_id and l.user_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = listing_pickup.listing_id and u.buyer_id = auth.uid()
  )
  or exists (
    select 1 from public.listing_unlock_requests r
    where r.listing_id = listing_pickup.listing_id
      and r.buyer_id = auth.uid()
      and r.status = 'pending'
  )
);

-- ---------------------------------------------------------------------------
-- RPC: post message with same eligibility rules (bypasses broken RLS on insert)
-- ---------------------------------------------------------------------------
create or replace function public.post_listing_message(p_listing_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trimmed text;
  v_display text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_trimmed := trim(p_body);
  if length(v_trimmed) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_body');
  end if;
  if length(v_trimmed) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'too_long');
  end if;

  if not exists (
    select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_uid
  )
  and not exists (
    select 1 from public.listing_unlocks u
    where u.listing_id = p_listing_id and u.buyer_id = v_uid
  )
  and not exists (
    select 1 from public.listing_unlock_requests r
    where r.listing_id = p_listing_id and r.buyer_id = v_uid and r.status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_participant');
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Member') into v_display
  from public.profiles
  where id = v_uid;

  if v_display is null then
    v_display := 'Member';
  end if;

  insert into public.listing_messages (listing_id, sender_id, sender_display_name, body)
  values (p_listing_id, v_uid, v_display, v_trimmed);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.post_listing_message(uuid, text) from public;
grant execute on function public.post_listing_message(uuid, text) to authenticated;

commit;
