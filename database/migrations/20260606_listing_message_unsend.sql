-- Soft-delete (unsend) listing messages: sender only, within 30 minutes of send.
begin;

alter table public.listing_messages
  add column if not exists deleted_at timestamptz null;

comment on column public.listing_messages.deleted_at is
  'When set, message body/image are hidden for all participants (unsent by sender).';

create or replace function public.delete_listing_message(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.listing_messages%rowtype;
  v_unsend_minutes constant int := 30;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_row
  from public.listing_messages
  where id = p_message_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_row.sender_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_sender');
  end if;

  if v_row.deleted_at is not null then
    return jsonb_build_object('ok', true);
  end if;

  if v_row.created_at < now() - make_interval(mins => v_unsend_minutes) then
    return jsonb_build_object('ok', false, 'error', 'window_expired');
  end if;

  update public.listing_messages
  set deleted_at = now()
  where id = p_message_id;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.delete_listing_message(uuid) from public;
grant execute on function public.delete_listing_message(uuid) to authenticated;

commit;
