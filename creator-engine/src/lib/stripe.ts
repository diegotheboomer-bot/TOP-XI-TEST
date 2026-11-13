import Stripe from 'stripe';
import { requireEnv } from './env';
import { monthStart } from './payout-costs';
import { depositRate } from './card-fees';

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return client;
}

/** US bank account (ACH) at checkout, once 'ACH Direct Debit' is turned on in Stripe. Set STRIPE_ACH_ENABLED=true. */
export const achEnabled = () => process.env.STRIPE_ACH_ENABLED?.trim() === 'true';

/**
 * With no service fee, businesses pay only Stripe's cost for their card (see card-fees.ts).
 * Before the card is entered, the checkout shows the estimate for a US card.
 */

/** The fee a streamer pays on deposits: early partners pay only card processing. */
/** NO_SERVICE_FEE=true: everyone pays only Stripe's card processing (launch pricing). */
export const noServiceFee = () => process.env.NO_SERVICE_FEE?.trim() === 'true';

export function feeFor(earlyPartner: boolean): { percent: number; fixed: number; early: boolean } {
  return earlyPartner || noServiceFee() ? { ...depositRate(null), early: true } : { percent: platformFeePercent(), fixed: 0, early: false };
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

/** Charged to streamers on top of the budget they fund. (Clippers pay 5% plus Stripe's payout fee on cash-outs; see tiers.ts and payout-costs.ts.) */
export const platformFeePercent = () => Number(process.env.PLATFORM_FEE_PERCENT ?? 9);

/**
 * A clipper's payout account. First try Stripe-owned pricing (fees.payer = account,
 * losses = stripe): Stripe then charges no Connect fees at all, so no €2 per active account
 * and no per-payout fee for Atlas (docs.stripe.com/connect/direct-charges-fee-payer-behavior).
 * Express accounts got this in Stripe's 2026-06-24 preview, so it's tried with the SDK's
 * version, then that preview version. If Stripe refuses both, the account is created the old
 * way (Atlas pays Connect fees, passed on at cash-out). STRIPE_OWNED_PRICING=false skips it.
 */
export async function createClipperAccount(creatorId: string): Promise<Stripe.Account> {
  return createPayoutAccount({ ...CLIPPER_ACCOUNT_DEFAULTS, metadata: { creator_id: creatorId } });
}

/** A business's payout account, only used to cash out affiliate earnings. Stripe asks whether it's a person or a company. */
export async function createBrandAccount(brandId: string): Promise<Stripe.Account> {
  return createPayoutAccount({
    business_profile: { url: 'https://atlasclipping.com', product_description: 'Receives affiliate earnings for referring clippers to Atlas Clipping.' },
    metadata: { brand_id: brandId },
  });
}

async function createPayoutAccount(extra: Omit<Stripe.AccountCreateParams, 'controller' | 'capabilities'>): Promise<Stripe.Account> {
  const base = { capabilities: { transfers: { requested: true } }, ...extra };
  if (process.env.STRIPE_OWNED_PRICING?.trim() !== 'false') {
    const params = { ...base, controller: { fees: { payer: 'account' as const }, losses: { payments: 'stripe' as const }, stripe_dashboard: { type: 'express' as const } } };
    for (const apiVersion of [undefined, '2026-06-24.preview']) {
      try {
        return await stripe().accounts.create(params, apiVersion ? { apiVersion } : undefined);
      } catch (err) {
        console.warn(`Stripe-owned pricing account refused${apiVersion ? ` (${apiVersion})` : ''}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return stripe().accounts.create({ ...base, controller: { fees: { payer: 'application' }, losses: { payments: 'application' }, stripe_dashboard: { type: 'express' } } });
}

/** True when Stripe bills this account directly, so Atlas pays (and passes on) no payout fees. */
export async function stripeOwnsPricing(accountId: string): Promise<boolean> {
  const a = await stripe().accounts.retrieve(accountId);
  return a.controller?.fees?.payer === 'account';
}

/** Whether Atlas has already paid this connected account this month (so Stripe's monthly fee is covered). */
export async function paidThisMonth(accountId: string): Promise<boolean> {
  const list = await stripe().transfers.list({ destination: accountId, created: { gte: Math.floor(monthStart().getTime() / 1000) }, limit: 1 });
  return list.data.length > 0;
}
