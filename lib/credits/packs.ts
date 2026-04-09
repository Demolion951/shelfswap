/**
 * Credit pack catalog (display + server validation). Stripe price IDs added later.
 * Location: lib/credits/packs.ts
 */
export type CreditPack = {
  id: string;
  credits: number;
  /** Shown until Stripe live pricing is wired */
  label: string;
  helper: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    credits: 5,
    label: "Starter",
    helper: "Enough for a few unlocks",
  },
  {
    id: "reader",
    credits: 15,
    label: "Reader",
    helper: "Better value for regular browsers",
  },
  {
    id: "shelf",
    credits: 40,
    label: "Shelf",
    helper: "For active local traders",
  },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
