-- Public-safe profile fields for joins (display name + avatar only).
-- Needed because profiles RLS currently allows selecting only your own row.

begin;

create or replace function public.profiles_public_batch(p_user_ids uuid[])
returns table(id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url
  from public.profiles p
  where p.id = any(p_user_ids);
$$;

revoke all on function public.profiles_public_batch(uuid[]) from public;
grant execute on function public.profiles_public_batch(uuid[]) to authenticated, anon;

comment on function public.profiles_public_batch(uuid[]) is
  'Returns public-safe profile fields (display_name, avatar_url) for the given user ids.';

commit;

