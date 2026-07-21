-- Marketing consent at sign-up + user/listing reports for safety review.
-- Location: database/migrations/20260721_marketing_consent_and_reports.sql

begin;

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.marketing_opt_in is
  'Optional marketing emails preference collected at sign-up (or updated later).';
comment on column public.profiles.terms_accepted_at is
  'When the user accepted Terms & Privacy at sign-up.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birthday date;
  v_marketing boolean;
  v_terms_at timestamptz;
begin
  begin
    v_birthday := nullif(trim(new.raw_user_meta_data->>'birthday'), '')::date;
  exception
    when others then
      v_birthday := null;
  end;

  v_marketing := coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false);

  begin
    v_terms_at := nullif(trim(new.raw_user_meta_data->>'terms_accepted_at'), '')::timestamptz;
  exception
    when others then
      v_terms_at := null;
  end;

  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    birthday,
    sex,
    marketing_opt_in,
    terms_accepted_at
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'New user'),
    null,
    v_birthday,
    nullif(trim(new.raw_user_meta_data->>'sex'), ''),
    v_marketing,
    v_terms_at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  constraint user_reports_target_check check (
    reported_user_id is not null or listing_id is not null
  ),
  constraint user_reports_reason_len check (char_length(trim(reason)) between 1 and 80),
  constraint user_reports_details_len check (details is null or char_length(details) <= 2000)
);

create index if not exists user_reports_created_at_idx on public.user_reports (created_at desc);
create index if not exists user_reports_reported_user_idx on public.user_reports (reported_user_id);
create index if not exists user_reports_listing_idx on public.user_reports (listing_id);

alter table public.user_reports enable row level security;

drop policy if exists "user_reports_insert_own" on public.user_reports;
create policy "user_reports_insert_own"
  on public.user_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own"
  on public.user_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

comment on table public.user_reports is
  'User-submitted reports about listings or accounts for safety review.';

commit;
