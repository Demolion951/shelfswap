-- Allow trusted RPCs (Stripe webhook, admin grant) to update subscription fields.
-- SQL Editor direct UPDATE still blocked unless trigger is temporarily disabled.

begin;

create or replace function public.profile_subscription_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (
      new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.subscription_status is distinct from old.subscription_status
      or new.subscription_period_end is distinct from old.subscription_period_end
    ) then
      if coalesce(current_setting('app.allow_subscription_write', true), '') = '1' then
        return new;
      end if;
      if coalesce((auth.jwt() ->> 'role'), '') is distinct from 'service_role' then
        raise exception 'subscription fields are read-only for clients';
      end if;
    end if;
  end if;
  return new;
end $$;

create or replace function public.stripe_apply_subscription_update(
  p_stripe_event_id text,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_subscription_write', '1', true);

  if exists (select 1 from public.stripe_subscription_events where stripe_event_id = p_stripe_event_id) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  update public.profiles
  set stripe_customer_id = coalesce(nullif(trim(p_customer_id), ''), stripe_customer_id),
      stripe_subscription_id = coalesce(nullif(trim(p_subscription_id), ''), stripe_subscription_id),
      subscription_status = coalesce(nullif(trim(p_status), ''), subscription_status),
      subscription_period_end = coalesce(p_period_end, subscription_period_end)
  where id = p_user_id;

  insert into public.stripe_subscription_events (stripe_event_id, user_id)
  values (p_stripe_event_id, p_user_id);

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_grant_premium(
  p_user_id uuid,
  p_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_days is null or p_days < 1 or p_days > 366 then
    return jsonb_build_object('ok', false, 'error', 'invalid_days');
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  perform set_config('app.allow_subscription_write', '1', true);
  update public.profiles
  set subscription_status = 'active',
      subscription_period_end = now() + make_interval(days => p_days)
  where id = p_user_id;

  return jsonb_build_object('ok', true, 'days', p_days);
end $$;

revoke all on function public.admin_grant_premium(uuid, int) from public;
grant execute on function public.admin_grant_premium(uuid, int) to service_role;

commit;
