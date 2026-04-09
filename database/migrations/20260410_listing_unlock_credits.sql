-- Credit-based unlock: each listing costs 1 or 2 credits (no GBP price in product flow).
-- price_cents kept for schema compatibility; new listings use 0 from the app.

begin;

alter table public.listings
  add column if not exists unlock_credits smallint not null default 1;

alter table public.listings
  drop constraint if exists listings_unlock_credits_check;

alter table public.listings
  add constraint listings_unlock_credits_check
  check (unlock_credits >= 1 and unlock_credits <= 2);

comment on column public.listings.unlock_credits is 'Credits required for a buyer to unlock this listing (1 or 2).';
comment on column public.listings.price_cents is 'Unused for credit-only trades; kept NOT NULL — app stores 0.';

commit;
