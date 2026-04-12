-- unlock_listing debits credit_balance while authenticated JWT is still "authenticated".
-- profile_credit_balance_guard only allowed service_role; RPC runs as SECURITY DEFINER but
-- auth.jwt() stays the caller's, so the trigger blocked unlocks. Allow debit when a trusted
-- RPC sets a transaction-local bypass (not settable by clients from SQL).

begin;

create or replace function public.profile_credit_balance_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.credit_balance is distinct from old.credit_balance then
    if coalesce(current_setting('app.allow_profile_credit_write', true), '') = '1' then
      return new;
    end if;
    if coalesce((auth.jwt() ->> 'role'), '') is distinct from 'service_role' then
      raise exception 'credit_balance is read-only for clients';
    end if;
  end if;
  return new;
end $$;

create or replace function public.unlock_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_seller uuid;
  v_cost int;
  v_rows int;
begin
  perform set_config('app.allow_profile_credit_write', '1', true);

  if v_buyer is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select l.user_id,
    case when l.unlock_credits = 2 then 2 else 1 end
  into v_seller, v_cost
  from public.listings l
  where l.id = p_listing_id and l.status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_not_found');
  end if;

  if v_seller = v_buyer then
    return jsonb_build_object('ok', false, 'error', 'own_listing');
  end if;

  if exists (
    select 1 from public.listing_unlocks u
    where u.buyer_id = v_buyer and u.listing_id = p_listing_id
  ) then
    return jsonb_build_object('ok', true, 'already_unlocked', true);
  end if;

  update public.profiles p
  set credit_balance = p.credit_balance - v_cost
  where p.id = v_buyer and p.credit_balance >= v_cost;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'required', v_cost
    );
  end if;

  insert into public.listing_unlocks (buyer_id, listing_id, credits_spent)
  values (v_buyer, p_listing_id, v_cost);

  return jsonb_build_object('ok', true, 'credits_spent', v_cost);
end $$;

revoke all on function public.unlock_listing(uuid) from public;
grant execute on function public.unlock_listing(uuid) to authenticated;

commit;
