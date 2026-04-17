-- Inserts listing_photos rows as the listing owner without relying on RLS subqueries
-- that can fail depending on which listings SELECT policies exist in production.
-- Location: database/migrations/20260429_add_listing_photo_rpc.sql

begin;

create or replace function public.add_my_listing_photo(
  p_listing_id uuid,
  p_url text,
  p_sort int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_listing_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  if p_url is null or btrim(p_url) = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_url');
  end if;

  if p_sort is null or p_sort < 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_sort');
  end if;

  select l.user_id into v_owner
  from public.listings l
  where l.id = p_listing_id;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  if v_owner <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  insert into public.listing_photos (listing_id, url, sort)
  values (p_listing_id, btrim(p_url), p_sort);

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.add_my_listing_photo(uuid, text, int) from public;
grant execute on function public.add_my_listing_photo(uuid, text, int) to authenticated;

commit;
