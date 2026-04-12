-- Approximate distance (km) between signed-in user's profile and listings; coarse coords only (rounded to 2 decimals).

begin;

-- Viewer must be authenticated; uses profiles.approx_location vs listings.approx_geo.
create or replace function public.listing_distances_km(p_listing_ids uuid[])
returns table(listing_id uuid, distance_km numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with viewer as (
    select approx_location from public.profiles where id = auth.uid()
  )
  select
    l.id,
    case
      when v.approx_location is not null and l.approx_geo is not null then
        round((st_distance(v.approx_location, l.approx_geo) / 1000.0)::numeric, 1)
      else null
    end
  from unnest(p_listing_ids) as wanted(id)
  inner join public.listings l on l.id = wanted.id and l.status = 'active'
  cross join viewer v;
$$;

revoke all on function public.listing_distances_km(uuid[]) from public;
grant execute on function public.listing_distances_km(uuid[]) to authenticated;

comment on function public.listing_distances_km(uuid[]) is
  'Returns straight-line km from auth user profile approx_location to each listing approx_geo; null if either missing.';

-- Coarse user area (~1.1 km); no exact address.
create or replace function public.set_my_approx_location(
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  rlat double precision;
  rlng double precision;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'invalid coordinates';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'coordinates out of range';
  end if;
  rlat := round(p_lat::numeric, 2);
  rlng := round(p_lng::numeric, 2);
  update public.profiles
  set approx_location = st_setsrid(st_makepoint(rlng, rlat), 4326)::geography
  where id = auth.uid();
end;
$$;

revoke all on function public.set_my_approx_location(double precision, double precision) from public;
grant execute on function public.set_my_approx_location(double precision, double precision) to authenticated;

-- Listing owner sets rough pickup area for distance hints (same rounding).
create or replace function public.set_listing_approx_geo(
  p_listing_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  rlat double precision;
  rlng double precision;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'invalid coordinates';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'coordinates out of range';
  end if;
  rlat := round(p_lat::numeric, 2);
  rlng := round(p_lng::numeric, 2);
  update public.listings
  set approx_geo = st_setsrid(st_makepoint(rlng, rlat), 4326)::geography
  where id = p_listing_id and user_id = auth.uid();
  if not found then
    raise exception 'listing not found or not owner';
  end if;
end;
$$;

revoke all on function public.set_listing_approx_geo(uuid, double precision, double precision) from public;
grant execute on function public.set_listing_approx_geo(uuid, double precision, double precision) to authenticated;

-- After listing insert: copy profile rough point to listing (optional).
create or replace function public.copy_listing_geo_from_profile(p_listing_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  loc geography;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select approx_location into loc from public.profiles where id = auth.uid();
  if loc is null then
    raise exception 'save your rough area in profile first';
  end if;
  update public.listings
  set approx_geo = loc
  where id = p_listing_id and user_id = auth.uid();
  if not found then
    raise exception 'listing not found or not owner';
  end if;
end;
$$;

revoke all on function public.copy_listing_geo_from_profile(uuid) from public;
grant execute on function public.copy_listing_geo_from_profile(uuid) to authenticated;

commit;
