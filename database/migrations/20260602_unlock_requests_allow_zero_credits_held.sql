-- Premium unlock requests no longer hold credits (credits_held = 0).
-- The original table check required credits_held >= 1, which blocks request_unlock_hold.

begin;

alter table public.listing_unlock_requests
  drop constraint if exists listing_unlock_requests_credits_held_check;

alter table public.listing_unlock_requests
  add constraint listing_unlock_requests_credits_held_check
  check (credits_held >= 0 and credits_held <= 2);

comment on column public.listing_unlock_requests.credits_held is
  'Credits reserved for this request (0 for Premium; 1–2 for legacy credit holds).';

commit;
