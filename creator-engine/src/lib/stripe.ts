import Stripe from 'stripe';
import { requireEnv } from './env';

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return client;
}

/** US bank account (ACH) at checkout, once 'ACH Direct Debit' is turned on in Stripe. Set STRIPE_ACH_ENABLED=true. */
export const achEnabled = () => process.env.STRIPE_ACH_ENABLED?.trim() === 'true';

/** Charged to streamers on top of the budget they fund. Clippers pay no fee. */
export const platformFeePercent = () => Number(process.env.PLATFORM_FEE_PERCENT ?? 9);
