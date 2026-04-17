Canonical SQL migrations live here (editable in Cursor).

Supabase CLI reads supabase/migrations/. If Cursor cannot open that folder, run:

  npm run db:sync-migrations

before: supabase db push / supabase migration up

Generated copies under supabase/migrations/*.sql are gitignored.

Storage (required for sell-flow photo uploads):

Without policies on storage.objects, uploads fail with:
  "new row violates row-level security policy"

Option A — Supabase CLI / migrations (preferred if your role can create policies
on storage.objects): run database/migrations/20260430_storage_listing_photos_policies.sql

Option B — Dashboard: Storage → bucket "listing-photos" → Policies. Create the
four policies described in database/migrations/20260409_000001_phase1_2_core.sql
(block "Storage bucket (listing-photos)") or copy from
20260430_storage_listing_photos_policies.sql.

Note: some hosted SQL Editor sessions cannot CREATE POLICY on storage.objects
("must be owner of table objects"). In that case use Option B.
