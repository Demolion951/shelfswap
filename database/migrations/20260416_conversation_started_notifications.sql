-- In-app notifications when the first message is posted on a listing thread.
-- Buyer → notify seller. Seller → notify each unlocked buyer. No email (app / Activity only).

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  listing_id uuid references public.listings (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

comment on table public.notifications is
  'User-facing alerts (e.g. first message on a listing). Read state for bell badge.';

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Inserts only from trigger (security definer); no client insert policy.

create or replace function public.notify_conversation_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_owner uuid;
  v_title text;
begin
  select count(*)::int into v_count
  from public.listing_messages
  where listing_id = new.listing_id;

  if v_count > 1 then
    return new;
  end if;

  select l.user_id, l.title into v_owner, v_title
  from public.listings l
  where l.id = new.listing_id;

  if v_owner is null then
    return new;
  end if;

  if new.sender_id = v_owner then
    insert into public.notifications (user_id, type, listing_id, payload)
    select
      u.buyer_id,
      'conversation_started',
      new.listing_id,
      jsonb_build_object(
        'role', 'seller',
        'listing_title', coalesce(v_title, 'your listing')
      )
    from public.listing_unlocks u
    where u.listing_id = new.listing_id;
  else
    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_owner,
      'conversation_started',
      new.listing_id,
      jsonb_build_object(
        'role', 'buyer',
        'sender_display_name', new.sender_display_name,
        'listing_title', coalesce(v_title, 'a listing')
      )
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_listing_messages_conversation_notify on public.listing_messages;
create trigger trg_listing_messages_conversation_notify
after insert on public.listing_messages
for each row execute function public.notify_conversation_started();

commit;
