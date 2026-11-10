import type { PayoutModel } from './types';

export interface PayoutTerms {
  payout_model: PayoutModel;
  base_payout: number;
  cpm_rate: number;
  cpm_cap: number;
  cps_commission_pct: number;
}

/**
 * Earnings for one creator in one campaign, in dollars (floored to the cent so
 * the platform never over-pays):
 *   hybrid           base + views/1000 × CPM
 *   pure_cpm         views/1000 × CPM
 *   cps_performance  attributed revenue × commission %
 * Always capped at cpm_cap.
 */
export function calculatePayout(terms: PayoutTerms, views: number, attributedRevenue = 0): number {
  const cpmPart = (Math.max(0, views) / 1000) * terms.cpm_rate;
  let earned: number;
  switch (terms.payout_model) {
    case 'hybrid':
      earned = terms.base_payout + cpmPart;
      break;
    case 'pure_cpm':
      earned = cpmPart;
      break;
    case 'cps_performance':
      earned = (Math.max(0, attributedRevenue) * terms.cps_commission_pct) / 100;
      break;
  }
  return floorCents(Math.min(earned, terms.cpm_cap));
}

/**
 * What a streamer is charged to add `budget` to a campaign: the budget (all of
 * which goes to clippers) plus the platform fee on top, rounded to the cent.
 */
export function streamerCharge(budget: number, feePercent: number, feeFixed = 0): { budget: number; fee: number; total: number } {
  const budgetCents = Math.round(budget * 100);
  const feeCents = Math.round((budgetCents * feePercent) / 100) + Math.round(feeFixed * 100);
  return { budget: budgetCents / 100, fee: feeCents / 100, total: (budgetCents + feeCents) / 100 };
}

const floorCents = (n: number) => Math.floor(n * 100 + 1e-6) / 100;
