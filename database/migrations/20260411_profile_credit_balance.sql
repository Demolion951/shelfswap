-- Buyer wallet: credit_balance on profiles. Mutations only via service_role (e.g. Stripe webhook) or add_credits_to_user RPC.

begin;

alter table public.profiles
  add column if not exists credit_balance integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_credit_balance_check;

alter table public.profiles
  add constraint profiles_credit_balance_check
  check (credit_balance >= 0);

comment on column public.profiles.credit_balance is 'Spendable credits (unlocks). Updated by server-side purchase webhooks or controlled RPC.';

-- Block authenticated users from editing balance directly (bypass: service_role JWT).
create or replace function public.profile_credit_balance_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.credit_balance is distinct from old.credit_balance then
    if coalesce((auth.jwt() ->> 'role'), '') is distinct from 'service_role' then
      raise exception 'credit_balance is read-only for clients';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_credit_guard on public.profiles;
create trigger trg_profiles_credit_guard
before update on public.profiles
for each row execute function public.profile_credit_balance_guard();

-- Called from trusted server code with service role key (after Stripe payment or dev flag).
create or replace function public.add_credits_to_user(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_delta is null or p_delta <= 0 or p_delta > 1000 then
    raise exception 'Invalid credit amount';
  end if;
  update public.profiles
  set credit_balance = credit_balance + p_delta
  where id = p_user_id
  returning credit_balance into v_balance;
  if v_balance is null then
    raise exception 'Profile not found';
  end if;
  return v_balance;
end $$;

revoke all on function public.add_credits_to_user(uuid, integer) from public;
grant execute on function public.add_credits_to_user(uuid, integer) to service_role;

commit;
