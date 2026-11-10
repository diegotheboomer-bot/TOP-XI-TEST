import Stripe from 'stripe';
import { requireEnv } from './env';

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

/** Charged to streamers on top of the budget they fund. Clippers pay no fee. */
export const platformFeePercent = () => Number(process.env.PLATFORM_FEE_PERCENT ?? 9);
