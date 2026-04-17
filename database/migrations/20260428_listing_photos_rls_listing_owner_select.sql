-- Fix listing_photos inserts for the listing owner right after create:
-- listing_photos_insert_owner checks listings via a subquery; without a SELECT
-- policy allowing the owner to read their own listing row, the subquery returns
-- no rows under RLS and inserts fail with "new row violates row-level security policy".

begin;

drop policy if exists "listings_select_owner_own" on public.listings;
create policy "listings_select_owner_own"
on public.listings
for select
to authenticated
using (user_id = auth.uid());

commit;
