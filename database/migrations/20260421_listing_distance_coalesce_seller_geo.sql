-- Distance km: if a listing has no approx_geo, use the seller's profile approx_location
-- (same rough area for all their books). Requires SECURITY DEFINER to read other profiles'
-- approx_location; only distance_km is returned (no coordinates exposed to the client).

begin;

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
           and coalesce(l.approx_geo, sp.approx_location) is not null then
        round(
          (
            st_distance(
              v.approx_location,
              coalesce(l.approx_geo, sp.approx_location)
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

revoke all on function public.listing_distances_km(uuid[]) from public;
grant execute on function public.listing_distances_km(uuid[]) to authenticated;

comment on function public.listing_distances_km(uuid[]) is
  'Straight-line km from viewer profile to listing approx_geo, or seller profile rough point if listing geo unset.';

commit;
