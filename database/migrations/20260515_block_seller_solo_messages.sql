-- Block sellers from posting listing messages until a buyer is involved (no solo self-chat).
-- Location: database/migrations/20260515_block_seller_solo_messages.sql

begin;

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
  v_is_seller boolean;
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
    if not exists (
      select 1 from public.listing_unlocks u
      where u.listing_id = p_listing_id
    )
    and not exists (
      select 1 from public.listing_unlock_requests r
      where r.listing_id = p_listing_id and r.status = 'pending'
    )
    and not exists (
      select 1 from public.listing_messages m
      join public.listings l on l.id = m.listing_id
      where m.listing_id = p_listing_id
        and m.sender_id <> l.user_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'no_buyer_yet');
    end if;
  elsif not exists (
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

commit;
