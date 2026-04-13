-- When a seller saves a new rough area on their profile, keep active listings aligned:
-- copy the same approx point to each listing, and refresh approx_area_text when provided.

begin;

create or replace function public.sync_my_active_listings_location_from_profile(
  p_approx_area_text text
)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.listings as l
  set
    approx_geo = p.approx_location,
    approx_area_text = case
      when p_approx_area_text is not null and btrim(p_approx_area_text) <> '' then
        btrim(p_approx_area_text)
      else
        l.approx_area_text
    end
  from public.profiles as p
  where p.id = auth.uid()
    and l.user_id = auth.uid()
    and l.status = 'active'
    and p.approx_location is not null;
$$;

revoke all on function public.sync_my_active_listings_location_from_profile(text) from public;
grant execute on function public.sync_my_active_listings_location_from_profile(text) to authenticated;

comment on function public.sync_my_active_listings_location_from_profile(text) is
  'Copies auth user profile approx_location (and optional area label) to all their active listings.';

commit;
