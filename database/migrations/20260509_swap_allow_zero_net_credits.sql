-- Swap accept can set net credits_spent to 0 (seller listing value <= offered book).
-- Prior check required 1–2 only, which broke accept_swap when net unlock is zero.

begin;

alter table public.listing_unlocks
  drop constraint if exists listing_unlocks_credits_spent_check;

alter table public.listing_unlocks
  add constraint listing_unlocks_credits_spent_check
  check (credits_spent >= 0 and credits_spent <= 2);

comment on column public.listing_unlocks.credits_spent is
  'Credits charged for this unlock (0–2). May be 0 after swap accept when offered book credit value meets or exceeds the listing.';

commit;
