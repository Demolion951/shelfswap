-- Storage RLS for bucket `listing-photos` (fixes uploads failing with
-- "new row violates row-level security policy" on storage.objects).
-- Location: database/migrations/20260430_storage_listing_photos_policies.sql
--
-- Apply with Supabase CLI / migration runner as a role that can CREATE POLICY
-- on storage.objects (often works locally). If the hosted SQL Editor returns
-- "must be owner of table objects", add the same policies via Dashboard:
-- Storage → listing-photos → Policies.

begin;

drop policy if exists "listing_photos_public_read" on storage.objects;
create policy "listing_photos_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'listing-photos');

drop policy if exists "listing_photos_owner_upload" on storage.objects;
create policy "listing_photos_owner_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_photos_owner_update" on storage.objects;
create policy "listing_photos_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_photos_owner_delete" on storage.objects;
create policy "listing_photos_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
