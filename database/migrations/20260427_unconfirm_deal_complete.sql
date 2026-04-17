-- Allow either party to withdraw their completion confirmation (before completion finalizes).
-- Location: database/migrations/20260427_unconfirm_deal_complete.sql

begin;

create or replace function public.unconfirm_deal_complete(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_buyer uuid;
  v_seller uuid;
  v_completed timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.buyer_id, l.user_id, u.completed_at
  into v_buyer, v_seller, v_completed
  from public.listing_unlocks u
  inner join public.listings l on l.id = u.listing_id
  where u.listing_id = p_listing_id
  order by u.created_at desc
  limit 1;

  if v_buyer is null or v_seller is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_completed is not null then
    return jsonb_build_object('ok', false, 'error', 'already_completed');
  end if;

  if v_uid = v_buyer then
    update public.listing_unlocks
    set buyer_confirmed_at = null
    where listing_id = p_listing_id and buyer_id = v_buyer;
  elsif v_uid = v_seller then
    update public.listing_unlocks
    set seller_confirmed_at = null
    where listing_id = p_listing_id and buyer_id = v_buyer;
  else
    return jsonb_build_object('ok', false, 'error', 'not_party');
  end if;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.unconfirm_deal_complete(uuid) from public;
grant execute on function public.unconfirm_deal_complete(uuid) to authenticated;

commit;

