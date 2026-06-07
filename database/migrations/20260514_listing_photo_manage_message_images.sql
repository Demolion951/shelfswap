-- Listing photo delete/reorder RPCs + optional image attachments on listing messages.
-- Location: database/migrations/20260514_listing_photo_manage_message_images.sql

begin;

-- ---------------------------------------------------------------------------
-- listing_messages: optional image attachment
-- ---------------------------------------------------------------------------
alter table public.listing_messages
  add column if not exists image_url text;

alter table public.listing_messages
  drop constraint if exists listing_messages_body_len;

alter table public.listing_messages
  add constraint listing_messages_body_len check (
    char_length(body) <= 2000
    and (
      char_length(body) > 0
      or nullif(btrim(coalesce(image_url, '')), '') is not null
    )
  );

comment on column public.listing_messages.image_url is
  'Public URL of an optional photo attached to this message (listing-photos bucket).';

-- ---------------------------------------------------------------------------
-- RPC: post message (text and/or image)
-- ---------------------------------------------------------------------------
drop function if exists public.post_listing_message(uuid, text);

create or replace function public.post_listing_message(
  p_listing_id uuid,
  p_body text,
  p_image_url text default null
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

  insert into public.listing_messages (
    listing_id,
    sender_id,
    sender_display_name,
    body,
    image_url
  )
  values (p_listing_id, v_uid, v_display, v_trimmed, v_image);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.post_listing_message(uuid, text, text) from public;
grant execute on function public.post_listing_message(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: delete one listing photo (owner only)
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_listing_photo(p_photo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_url text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_photo_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  select lp.url into v_url
  from public.listing_photos lp
  join public.listings l on l.id = lp.listing_id
  where lp.id = p_photo_id
    and l.user_id = v_uid;

  if v_url is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.listing_photos where id = p_photo_id;

  return jsonb_build_object('ok', true, 'url', v_url);
end;
$$;

revoke all on function public.delete_my_listing_photo(uuid) from public;
grant execute on function public.delete_my_listing_photo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: reorder listing photos (owner only)
-- ---------------------------------------------------------------------------
create or replace function public.reorder_my_listing_photos(
  p_listing_id uuid,
  p_photo_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_expected int;
  v_provided int;
  v_i int;
  v_pid uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_listing_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  if p_photo_ids is null then
    return jsonb_build_object('ok', false, 'error', 'bad_order');
  end if;

  if not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select count(*)::int into v_expected
  from public.listing_photos
  where listing_id = p_listing_id;

  v_provided := coalesce(array_length(p_photo_ids, 1), 0);

  if v_provided <> v_expected then
    return jsonb_build_object('ok', false, 'error', 'bad_order');
  end if;

  if v_provided > 0 and v_provided <> (
    select count(distinct x)::int
    from unnest(p_photo_ids) as x
    where exists (
      select 1 from public.listing_photos lp
      where lp.id = x and lp.listing_id = p_listing_id
    )
  ) then
    return jsonb_build_object('ok', false, 'error', 'bad_order');
  end if;

  for v_i in 0..(v_provided - 1) loop
    v_pid := p_photo_ids[v_i + 1];
    update public.listing_photos
    set sort = v_i
    where id = v_pid and listing_id = p_listing_id;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reorder_my_listing_photos(uuid, uuid[]) from public;
grant execute on function public.reorder_my_listing_photos(uuid, uuid[]) to authenticated;

commit;
