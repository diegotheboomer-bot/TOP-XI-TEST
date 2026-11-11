'use server';


// /test/money only: a small REAL deposit and cash-out with the live Stripe keys.
// Nothing is saved in the database; the test clipper account lives in a cookie.
import { cookies } from 'next/headers';
import { CLIPPER_ACCOUNT_DEFAULTS, stripe } from '@/lib/stripe';
import { getViewer } from '@/lib/session';
import type { ActionState } from './result';

const testStripe = stripe;
const ACCOUNT_COOKIE = 'test_connect_account';
const INTENT_COOKIE = 'test_deposit_intent';

async function signedIn() {
  if (!(await getViewer())) throw new Error('Sign in first.');
}

export async function testDeposit(_campaignId: string, amount: number): Promise<{ clientSecret: string } | { error: string }> {
  try {
    await signedIn();
    const intent = await testStripe().paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      allowed_payment_method_types: ['card'],
      description: 'Atlas test deposit',
    });
    cookies().set(INTENT_COOKIE, intent.id, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86_400, path: '/' });
    return { clientSecret: intent.client_secret! };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not start the payment.' };
  }
}

export async function testConnectSession(): Promise<{ clientSecret: string } | { error: string }> {
  try {
    await signedIn();
    const s = testStripe();
    let account = cookies().get(ACCOUNT_COOKIE)?.value;
    if (!account) {
      account = (
        await s.accounts.create({
          controller: { fees: { payer: 'application' }, losses: { payments: 'application' }, stripe_dashboard: { type: 'express' } },
          capabilities: { transfers: { requested: true } },
          ...CLIPPER_ACCOUNT_DEFAULTS,
        })
      ).id;
      cookies().set(ACCOUNT_COOKIE, account, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86_400, path: '/' });
    } else {
      // An account made before the defaults existed: fill them in so the form skips those questions.
      await s.accounts.update(account, CLIPPER_ACCOUNT_DEFAULTS).catch(() => undefined);
    }
    const session = await s.accountSessions.create({ account, components: { account_onboarding: { enabled: true, features: { external_account_collection: true } } } });
    return { clientSecret: session.client_secret };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not start bank setup.' };
  }
}

export interface TestStatus {
  available: number;
  pending: number;
  account: string | null;
  payoutsEnabled: boolean;
  clipperBalance: number;
}

export async function testStatus(): Promise<TestStatus | { error: string }> {
  try {
    await signedIn();
    const s = testStripe();
    const bal = await s.balance.retrieve();
    const usd = (list: { amount: number; currency: string }[]) => list.filter((b) => b.currency === 'usd').reduce((n, b) => n + b.amount, 0) / 100;
    const account = cookies().get(ACCOUNT_COOKIE)?.value ?? null;
    let payoutsEnabled = false;
    let clipperBalance = 0;
    if (account) {
      payoutsEnabled = !!(await s.accounts.retrieve(account)).payouts_enabled;
      const cb = await s.balance.retrieve({}, { stripeAccount: account });
      clipperBalance = usd(cb.available) + usd(cb.pending);
    }
    return { available: usd(bal.available), pending: usd(bal.pending), account, payoutsEnabled, clipperBalance };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error' };
  }
}

export async function testCashOut(amount: number): Promise<ActionState> {
  try {
    await signedIn();
    const account = cookies().get(ACCOUNT_COOKIE)?.value;
    if (!account) return { error: 'Connect a test bank first (step 2).' };
    // Tied to the deposit's charge, so it can be sent before the card money becomes available (about 2 days).
    const intentId = cookies().get(INTENT_COOKIE)?.value;
    const intent = intentId ? await testStripe().paymentIntents.retrieve(intentId) : null;
    const charge = intent?.status === 'succeeded' ? (intent.latest_charge as string | null) : null;
    if (!charge) return { error: 'Make a deposit first (step 1).' };
    const t = await testStripe().transfers.create({ amount: Math.round(amount * 100), currency: 'usd', destination: account, source_transaction: charge, description: 'Atlas test cash-out' });
    return { success: `Sent $${amount.toFixed(2)} to the test clipper account (${t.id}).` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Cash-out failed.' };
  }
}
