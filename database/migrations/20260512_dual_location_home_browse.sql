-- Split seller "home" location (fixed on listings) from "browse" location (discovery distances).
-- Browse continues to use profiles.approx_location; listings use home_approx_location.

begin;

alter table public.profiles
  add column if not exists home_approx_location geography(point, 4326),
  add column if not exists home_approx_area_text text;

comment on column public.profiles.approx_location is
  'Current rough location for browsing distances (updates when you travel).';
comment on column public.profiles.approx_area_text is
  'Human-readable label for browse location (town/area).';
comment on column public.profiles.home_approx_location is
  'Fixed rough location where your books are — shown on listings and to other users.';
comment on column public.profiles.home_approx_area_text is
  'Human-readable label for home/listing location (town/area).';

-- Backfill home from existing profile + listing data.
update public.profiles p
set
  home_approx_location = coalesce(p.home_approx_location, p.approx_location),
  home_approx_area_text = coalesce(
    nullif(btrim(p.home_approx_area_text), ''),
    nullif(btrim(p.approx_area_text), '')
  )
where p.approx_location is not null or p.approx_area_text is not null;

create or replace function public.set_my_home_approx_location(
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
  set home_approx_location = st_setsrid(st_makepoint(rlng, rlat), 4326)::geography
  where id = auth.uid();
end;
$$;

revoke all on function public.set_my_home_approx_location(double precision, double precision) from public;
grant execute on function public.set_my_home_approx_location(double precision, double precision) to authenticated;

-- Copy home point (and optional area label) to seller active listings only — not called on browse updates.
create or replace function public.sync_my_active_listings_from_home(
  p_home_area_text text
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.listings as l
  set
    approx_geo = p.home_approx_location,
    approx_area_text = case
      when p_home_area_text is not null and btrim(p_home_area_text) <> '' then
        btrim(p_home_area_text)
      else
        l.approx_area_text
    end
  from public.profiles as p
  where p.id = auth.uid()
    and l.user_id = auth.uid()
    and l.status = 'active'
    and p.home_approx_location is not null;
$$;

revoke all on function public.sync_my_active_listings_from_home(text) from public;
grant execute on function public.sync_my_active_listings_from_home(text) to authenticated;

comment on function public.sync_my_active_listings_from_home(text) is
  'Copies auth user home_approx_location to all their active listings (fixed pickup area).';

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
  select coalesce(home_approx_location, approx_location)
  into loc
  from public.profiles
  where id = auth.uid();
  if loc is null then
    raise exception 'save your home area in settings first';
  end if;
  update public.listings
  set approx_geo = loc
  where id = p_listing_id and user_id = auth.uid();
  if not found then
    raise exception 'listing not found or not owner';
  end if;
end;
$$;

create or replace function public.listing_distances_km(p_listing_ids uuid[])
returns table(listing_id uuid, distance_km numeric)
language sql
stable
security definer
set search_path = public
as $$
  with viewer as (
    select approx_location from public.profiles where id = auth.uid()
  )
  select
    l.id,
    case
      when v.approx_location is not null
           and coalesce(l.approx_geo, sp.home_approx_location, sp.approx_location) is not null then
        round(
          (
            st_distance(
              v.approx_location,
              coalesce(l.approx_geo, sp.home_approx_location, sp.approx_location)
            ) / 1000.0
          )::numeric,
          1
        )
      else null
    end
  from unnest(p_listing_ids) as wanted(id)
  inner join public.listings l
    on l.id = wanted.id and l.status = 'active'
  inner join public.profiles sp on sp.id = l.user_id
  cross join viewer v;
$$;

comment on function public.listing_distances_km(uuid[]) is
  'Km from viewer browse location to listing home geo (or seller home fallback).';

commit;
