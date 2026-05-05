-- Swap accept/decline: notify buyers (Activity + bell) and keep respond_swap logic unchanged aside from notifications.

begin;

create or replace function public.respond_swap(p_listing_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid := auth.uid();
  v_listing_title text;
  r record;
  v_any boolean := false;
  v_offered_title text;
begin
  if v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.listings l where l.id = p_listing_id and l.user_id = v_seller) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select l.title into v_listing_title from public.listings l where l.id = p_listing_id;

  if p_accept then
    for r in
      select buyer_id, offered_listing_id
      from public.listing_unlocks u
      where u.listing_id = p_listing_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed'
      for update
    loop
      v_any := true;
      v_offered_title := null;
      if r.offered_listing_id is not null then
        select ol.title into v_offered_title from public.listings ol where ol.id = r.offered_listing_id;
      end if;

      update public.listing_unlocks u
      set swap_status = 'accepted'
      where u.listing_id = p_listing_id
        and u.buyer_id = r.buyer_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed';

      insert into public.notifications (user_id, type, listing_id, payload)
      values (
        r.buyer_id,
        'swap_accepted',
        p_listing_id,
        jsonb_build_object(
          'listing_title', coalesce(v_listing_title, 'their listing'),
          'offered_title', coalesce(v_offered_title, 'your book'),
          'offered_listing_id', r.offered_listing_id
        )
      );
    end loop;
  else
    for r in
      select buyer_id, offered_listing_id
      from public.listing_unlocks u
      where u.listing_id = p_listing_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed'
      for update
    loop
      v_any := true;
      v_offered_title := null;
      if r.offered_listing_id is not null then
        select ol.title into v_offered_title from public.listings ol where ol.id = r.offered_listing_id;
      end if;

      update public.listing_unlocks u
      set swap_status = 'declined',
          deal_type = 'pickup',
          offered_listing_id = null
      where u.listing_id = p_listing_id
        and u.buyer_id = r.buyer_id
        and u.deal_type = 'swap'
        and u.swap_status = 'proposed';

      insert into public.notifications (user_id, type, listing_id, payload)
      values (
        r.buyer_id,
        'swap_declined',
        p_listing_id,
        jsonb_build_object(
          'listing_title', coalesce(v_listing_title, 'their listing'),
          'offered_title', coalesce(v_offered_title, 'your book'),
          'offered_listing_id', r.offered_listing_id
        )
      );
    end loop;
  end if;

  if not v_any then
    return jsonb_build_object('ok', false, 'error', 'no_offer');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.respond_swap(uuid, boolean) from public;
grant execute on function public.respond_swap(uuid, boolean) to authenticated;

commit;
