Canonical SQL migrations live here (editable in Cursor).

Supabase CLI reads supabase/migrations/. If Cursor cannot open that folder, run:

  npm run db:sync-migrations

before: supabase db push / supabase migration up

Generated copies under supabase/migrations/*.sql are gitignored.

Storage: after the first migration, add policies for bucket listing-photos in the Supabase Dashboard (SQL Editor cannot own storage.objects on hosted projects).
