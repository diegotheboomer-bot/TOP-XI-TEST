// What Stripe charges Atlas to take a business's deposit, so the business pays exactly that on
// top and the campaign gets the full budget. Stripe Portugal pricing (stripe.com/en-pt/pricing):
// standard EEA cards 1.5% + €0.25, premium EEA cards 2.8% + €0.25, UK cards 2.5% + €0.25,
// international cards 3.15% + €0.25, plus 2% when a charge is converted (USD → the EUR balance).
// Radar screening adds about €0.05.

const EEA = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE'.split(' '));

/** €0.25 + €0.05 Radar, in dollars with room for the exchange rate. */
export const CARD_FIXED_USD = 0.36;

/** Conversion fee on USD deposits: 2%, or what STRIPE_FX_PERCENT says (e.g. 1 with USD settlement on). */
export const fxPercent = () => {
  const v = Number(process.env.STRIPE_FX_PERCENT);
  return Number.isFinite(v) && v >= 0 && process.env.STRIPE_FX_PERCENT?.trim() ? v : 2;
};

export type CardInfo = { country?: string | null; funding?: string | null };

/** Stripe's card rate in percent for this card, before currency conversion. */
export function cardPercent(card: CardInfo): number {
  const country = card.country?.toUpperCase() ?? '';
  if (EEA.has(country)) return card.funding === 'debit' || card.funding === 'prepaid' ? 1.5 : 2.8; // credit may be premium: assume the higher rate
  if (country === 'GB') return 2.5;
  return 3.15;
}

/** The rate and fixed part for a card (or the estimate for a US card when the card isn't known yet). */
export function depositRate(card: CardInfo | null, fx = fxPercent()): { percent: number; fixed: number } {
  return { percent: Math.round((cardPercent(card ?? { country: 'US' }) + fx) * 100) / 100, fixed: CARD_FIXED_USD };
}

/**
 * Grossed up so that after Stripe takes `percent` of the whole charge plus `fixed`,
 * exactly `budget` is left: total = (budget + fixed) / (1 − percent).
 */
export function grossUp(budget: number, percent: number, fixed: number): { budget: number; fee: number; total: number } {
  const budgetCents = Math.round(budget * 100);
  const totalCents = Math.ceil((budgetCents + fixed * 100) / (1 - percent / 100));
  return { budget: budgetCents / 100, fee: (totalCents - budgetCents) / 100, total: totalCents / 100 };
}
