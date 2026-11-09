import Stripe from 'stripe';
import { requireEnv } from './env';

let client: Stripe | null = null;
export function stripe(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  return client;
}

/** Charged to streamers on top of the budget they fund. Clippers pay no fee. */
export const platformFeePercent = () => Number(process.env.PLATFORM_FEE_PERCENT ?? 9);
