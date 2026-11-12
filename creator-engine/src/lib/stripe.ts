import Stripe from 'stripe';
import { requireEnv } from './env';
import { monthStart } from './payout-costs';

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return client;
}

/** US bank account (ACH) at checkout, once 'ACH Direct Debit' is turned on in Stripe. Set STRIPE_ACH_ENABLED=true. */
export const achEnabled = () => process.env.STRIPE_ACH_ENABLED?.trim() === 'true';

/**
 * Early partners (brands.early_partner) pay no service fee: only an estimate of
 * Stripe's card processing cost. Stripe Portugal charges international cards
 * (e.g. US) 3.15% + €0.25, plus €0.05 for Radar fraud screening, so 3.5% + $0.35 covers it.
 */
export const EARLY_PARTNER_FEE = { percent: 3.5, fixed: 0.35 };

/** The fee a streamer pays on deposits: early partners pay only card processing. */
/** NO_SERVICE_FEE=true: everyone pays only Stripe's card processing (launch pricing). */
export const noServiceFee = () => process.env.NO_SERVICE_FEE?.trim() === 'true';

export function feeFor(earlyPartner: boolean): { percent: number; fixed: number; early: boolean } {
  return earlyPartner || noServiceFee() ? { ...EARLY_PARTNER_FEE, early: true } : { percent: platformFeePercent(), fixed: 0, early: false };
}

/**
 * Pre-filled for every clipper's payout account, so Stripe's form skips the
 * "business details" questions (website, what you sell). Clippers are individuals
 * paid for clips on Atlas.
 */
export const CLIPPER_ACCOUNT_DEFAULTS = {
  business_type: 'individual' as const,
  business_profile: {
    url: 'https://atlasclipping.com',
    product_description: 'Creates short video clips of streams and posts them on social media, paid per view through Atlas Clipping.',
  },
};

/** Charged to streamers on top of the budget they fund. (Clippers pay 2% plus Stripe's payout fee on cash-outs; see tiers.ts and payout-costs.ts.) */
export const platformFeePercent = () => Number(process.env.PLATFORM_FEE_PERCENT ?? 9);

/** Whether Atlas has already paid this connected account this month (so Stripe's monthly fee is covered). */
export async function paidThisMonth(accountId: string): Promise<boolean> {
  const list = await stripe().transfers.list({ destination: accountId, created: { gte: Math.floor(monthStart().getTime() / 1000) }, limit: 1 });
  return list.data.length > 0;
}
