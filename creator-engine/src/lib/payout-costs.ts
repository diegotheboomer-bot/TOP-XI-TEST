// Stripe's charges for paying a clipper, passed on to the clipper at cash-out.
// Stripe (Portugal, "you handle pricing"): €0.10 + 0.25% per payout to a bank, and €2 for
// each connected account paid in a month. Shown in dollars with a little room for the
// exchange rate, so Atlas doesn't pay them out of its 5%.
export const STRIPE_PAYOUT_PCT = 0.25;
export const STRIPE_PAYOUT_FIXED = 0.15;
export const STRIPE_MONTHLY = 2.4;

/** Stripe's cost for one cash-out of `amount`; `firstThisMonth` adds the monthly account fee. */
export function stripePayoutCost(amount: number, firstThisMonth: boolean): number {
  const c = (amount * STRIPE_PAYOUT_PCT) / 100 + STRIPE_PAYOUT_FIXED + (firstThisMonth ? STRIPE_MONTHLY : 0);
  return Math.round(c * 100) / 100;
}

/** First day of this month (UTC), when Stripe's monthly account fee starts over. */
export const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
