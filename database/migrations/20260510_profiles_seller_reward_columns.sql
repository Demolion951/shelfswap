-- Seller reward columns required by confirm_deal_complete (from 20260427).
-- Safe if you already ran 20260427_rewards_and_completion.sql.

begin;

alter table public.profiles
  add column if not exists completed_sales_count int not null default 0,
  add column if not exists reward_credits_earned int not null default 0;

alter table public.profiles
  drop constraint if exists profiles_completed_sales_count_nonnegative;
alter table public.profiles
  add constraint profiles_completed_sales_count_nonnegative check (completed_sales_count >= 0);

alter table public.profiles
  drop constraint if exists profiles_reward_credits_earned_nonnegative;
alter table public.profiles
  add constraint profiles_reward_credits_earned_nonnegative check (reward_credits_earned >= 0);

comment on column public.profiles.completed_sales_count is
  'Count of completed deals as a seller (both parties confirmed completion).';
comment on column public.profiles.reward_credits_earned is
  'Credits granted by the seller reward program (1 credit per 5 completed sales).';

commit;
