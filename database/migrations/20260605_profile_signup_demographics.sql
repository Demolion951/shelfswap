-- Profile demographics collected at sign-up (private — not exposed via profiles_public_batch).
-- Location: database/migrations/20260605_profile_signup_demographics.sql

begin;

alter table public.profiles
  add column if not exists birthday date,
  add column if not exists sex text;

alter table public.profiles
  drop constraint if exists profiles_sex_check;

alter table public.profiles
  add constraint profiles_sex_check
  check (
    sex is null
    or sex in ('female', 'male', 'non_binary', 'prefer_not_to_say')
  );

comment on column public.profiles.birthday is
  'User date of birth (private; collected at sign-up).';
comment on column public.profiles.sex is
  'User sex/gender selection (private; collected at sign-up).';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birthday date;
begin
  begin
    v_birthday := nullif(trim(new.raw_user_meta_data->>'birthday'), '')::date;
  exception
    when others then
      v_birthday := null;
  end;

  insert into public.profiles (id, display_name, avatar_url, birthday, sex)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'New user'),
    null,
    v_birthday,
    nullif(trim(new.raw_user_meta_data->>'sex'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

commit;
