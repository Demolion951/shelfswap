-- Listing unlocks (spend credits) + idempotent Stripe webhook credit grants.

begin;

-- -----------------------------------------------------------------------------
-- Stripe webhook idempotency (processed event ids)
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

comment on table public.stripe_webhook_events is 'Dedup Stripe webhook deliveries; no client access.';

-- -----------------------------------------------------------------------------
-- Who unlocked which listing (buyer spent credits)
-- -----------------------------------------------------------------------------
create table if not exists public.listing_unlocks (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  credits_spent int not null check (credits_spent >= 1 and credits_spent <= 2),
  created_at timestamptz not null default now(),
  unique (buyer_id, listing_id)
);

create index if not exists listing_unlocks_listing_id_idx on public.listing_unlocks (listing_id);
create index if not exists listing_unlocks_buyer_id_idx on public.listing_unlocks (buyer_id);

comment on table public.listing_unlocks is 'Buyer paid credits to unlock a listing (location/chat next).';

alter table public.listing_unlocks enable row level security;

drop policy if exists "listing_unlocks_select_buyer" on public.listing_unlocks;
create policy "listing_unlocks_select_buyer"
on public.listing_unlocks
for select
to authenticated
using (buyer_id = auth.uid());

drop policy if exists "listing_unlocks_select_seller" on public.listing_unlocks;
create policy "listing_unlocks_select_seller"
on public.listing_unlocks
for select
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_unlocks.listing_id and l.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- Buyer unlocks a listing: atomic debit + row (auth.uid() = buyer)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Stripe: record event + add credits in one transaction (service_role only)
-- -----------------------------------------------------------------------------
create or replace function public.stripe_apply_credit_purchase(
  p_stripe_event_id text,
  p_user_id uuid,
  p_credits int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_stripe_event_id is null or length(trim(p_stripe_event_id)) < 10 then
    return jsonb_build_object('ok', false, 'error', 'bad_event_id');
  end if;

  if p_credits is null or p_credits <= 0 or p_credits > 1000 then
    return jsonb_build_object('ok', false, 'error', 'invalid_credits');
  end if;

  begin
    insert into public.stripe_webhook_events (stripe_event_id, event_type)
    values (p_stripe_event_id, 'checkout.session.completed');
  exception
    when unique_violation then
      return jsonb_build_object('ok', true, 'duplicate', true);
  end;

  update public.profiles
  set credit_balance = credit_balance + p_credits
  where id = p_user_id
  returning credit_balance into v_balance;

  if v_balance is null then
    delete from public.stripe_webhook_events where stripe_event_id = p_stripe_event_id;
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  return jsonb_build_object('ok', true, 'new_balance', v_balance);
end $$;

revoke all on function public.stripe_apply_credit_purchase(text, uuid, integer) from public;
grant execute on function public.stripe_apply_credit_purchase(text, uuid, integer) to service_role;

commit;
