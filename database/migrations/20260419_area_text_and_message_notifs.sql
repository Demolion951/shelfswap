-- Add human-friendly area text (town/area) and notify users on every new message.

begin;

alter table public.profiles
  add column if not exists approx_area_text text;

comment on column public.profiles.approx_area_text is
  'Human-friendly rough area (e.g. "Ealing, London"). Not precise address.';

alter table public.listings
  add column if not exists approx_area_text text;

comment on column public.listings.approx_area_text is
  'Human-friendly rough area for this listing (e.g. "Ealing, London"). Not precise address.';

create index if not exists listings_approx_area_text_idx
  on public.listings (approx_area_text);

-- Notify participants on each new message (exclude sender).
create or replace function public.notify_new_listing_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_title text;
  v_preview text;
begin
  select l.user_id, l.title into v_owner, v_title
  from public.listings l
  where l.id = new.listing_id;

  if v_owner is null then
    return new;
  end if;

  v_preview := left(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'), 140);

  -- Seller notification
  if v_owner <> new.sender_id then
    insert into public.notifications (user_id, type, listing_id, payload)
    values (
      v_owner,
      'new_message',
      new.listing_id,
      jsonb_build_object(
        'sender_display_name', new.sender_display_name,
        'listing_title', coalesce(v_title, 'a listing'),
        'preview', v_preview
      )
    );
  end if;

  -- Unlocked buyers notifications
  insert into public.notifications (user_id, type, listing_id, payload)
  select
    u.buyer_id,
    'new_message',
    new.listing_id,
    jsonb_build_object(
      'sender_display_name', new.sender_display_name,
      'listing_title', coalesce(v_title, 'a listing'),
      'preview', v_preview
    )
  from public.listing_unlocks u
  where u.listing_id = new.listing_id
    and u.buyer_id <> new.sender_id;

  return new;
end $$;

drop trigger if exists trg_listing_messages_new_message_notify on public.listing_messages;
create trigger trg_listing_messages_new_message_notify
after insert on public.listing_messages
for each row execute function public.notify_new_listing_message();

commit;

