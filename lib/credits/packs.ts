/**
 * Credit pack catalog (display + server validation). Stripe price IDs added later.
 * Location: lib/credits/packs.ts
 */
export type CreditPack = {
  id: string;
  credits: number;
  label: string;
  helper: string;
  /** Display only — actual charge is whatever you set on the Stripe Price */
  priceLabel: string;
};

/**
 * Credit counts are authoritative for how many credits the webhook grants.
 * Set each Stripe Price (GBP) to match priceLabel, or change labels here if you adjust Stripe.
 * Use 11 credits for the bundle instead of 10 by changing `credits` on `bundle` below.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "single",
    credits: 1,
    label: "Single",
    helper: "One unlock (listings cost 1 or 2 credits)",
    priceLabel: "£1.49",
  },
  {
    id: "five",
    credits: 5,
    label: "Five",
    helper: "A few books nearby",
    priceLabel: "£5.99",
  },
  {
    id: "bundle",
    credits: 10,
    label: "Bundle",
    helper: "Best value for regular readers",
    priceLabel: "£9.99",
  },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
