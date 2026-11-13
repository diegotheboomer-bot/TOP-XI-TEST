'use server';

// A business's affiliate balance (fees from clippers who joined with its invite link):
// add it to a campaign's budget as a discount, or cash it out to its own payout account.
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createBrandAccount, paidThisMonth, stripe, stripeOwnsPricing } from '@/lib/stripe';
import { MIN_CASHOUT } from '@/lib/payout-rules';
import { stripePayoutCost } from '@/lib/payout-costs';
import { usdCents } from '@/lib/format';
import type { ActionState } from './result';
import type { PayoutSessionResult } from './creator';

async function requireBrand(): Promise<string> {
  const viewer = await getViewer();
  if (!viewer?.brandId) throw new Error('Sign in as a business first.');
  return viewer.brandId;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Adds the whole available balance to one of the business's campaigns as budget. */
export async function applyAffiliateBalance(campaignId: string): Promise<ActionState> {
  if (isDemo) return { error: 'Not available in the demo.' };
  const brandId = await requireBrand();
  const admin = createAdminClient();
  const { data: camp } = await admin.from('campaigns').select('id, title, status').eq('id', campaignId).eq('brand_id', brandId).maybeSingle();
  if (!camp) return { error: 'Campaign not found.' };
  if (camp.status === 'completed') return { error: 'That campaign has ended. Pick a running or draft campaign.' };
  const now = new Date().toISOString();
  // Claim the available rows in one update, so a double tap can't use them twice.
  const { data: rows } = await admin
    .from('brand_affiliate_earnings')
    .update({ status: 'applied', campaign_id: camp.id, used_at: now })
    .eq('brand_id', brandId)
    .eq('status', 'available')
    .select('amount');
  const total = round((rows ?? []).reduce((n, r) => n + Number(r.amount), 0));
  if (!(total > 0)) return { error: 'There’s nothing in your affiliate balance yet.' };
  await admin.from('escrow_ledger').insert({ campaign_id: camp.id, entry_type: 'referral_credit', amount: total, stripe_object_id: `aff:${randomUUID()}` });
  await admin.rpc('escrow_credit', { p_campaign: camp.id, p_amount: total });
  revalidatePath('/streamer', 'layout');
  return { success: `${usdCents(total)} added to “${camp.title}”.` };
}

/** Sends the available balance to the business's payout account, minus Stripe's payout fee. */
export async function cashOutAffiliate(): Promise<ActionState> {
  if (isDemo) return { error: 'Not available in the demo.' };
  const brandId = await requireBrand();
  const admin = createAdminClient();
  const { data: brand } = await admin.from('brands').select('stripe_account_id, payouts_enabled').eq('id', brandId).single();
  if (!brand?.stripe_account_id || !brand.payouts_enabled) return { error: 'Set up your payout account first.' };
  const { data: avail } = await admin.from('brand_affiliate_earnings').select('amount').eq('brand_id', brandId).eq('status', 'available');
  const total = round((avail ?? []).reduce((n, r) => n + Number(r.amount), 0));
  if (total < MIN_CASHOUT) return { error: `You can cash out from ${usdCents(MIN_CASHOUT)}. You have ${usdCents(total)}.` };

  const claim = `claim:${randomUUID()}`;
  const { data: rows } = await admin.from('brand_affiliate_earnings').update({ status: 'paid', transfer_id: claim, used_at: new Date().toISOString() }).eq('brand_id', brandId).eq('status', 'available').select('amount');
  const amount = round((rows ?? []).reduce((n, r) => n + Number(r.amount), 0));
  const account = brand.stripe_account_id as string;
  try {
    const free = await stripeOwnsPricing(account).catch(() => false);
    const first = !free && !(await paidThisMonth(account).catch(() => false));
    const cost = free ? 0 : stripePayoutCost(amount, first);
    const send = round(amount - cost);
    if (send <= 0) throw new Error('Amount is too small to pay out.');
    const transfer = await stripe().transfers.create({ amount: Math.round(send * 100), currency: 'usd', destination: account, metadata: { kind: 'brand_affiliate', brand_id: brandId } }, { idempotencyKey: `brandaff_${claim}` });
    await admin.from('brand_affiliate_earnings').update({ transfer_id: transfer.id }).eq('transfer_id', claim);
    revalidatePath('/streamer/invite');
    return { success: `${usdCents(send)} is on its way${cost > 0 ? ` (Stripe payout fee ${usdCents(cost)})` : ''}.` };
  } catch (err) {
    await admin.from('brand_affiliate_earnings').update({ status: 'available', transfer_id: null, used_at: null }).eq('transfer_id', claim);
    return { error: err instanceof Error ? err.message : 'Couldn’t cash out. Try again.' };
  }
}

/** Client secret for the embedded payout setup form on /streamer/payouts. */
export async function createBrandPayoutSession(): Promise<PayoutSessionResult> {
  if (isDemo) return { error: 'Stripe is off in demo mode.' };
  try {
    const brandId = await requireBrand();
    const admin = createAdminClient();
    const { data: brand } = await admin.from('brands').select('stripe_account_id').eq('id', brandId).single();
    let account = brand?.stripe_account_id as string | null;
    if (!account) {
      account = (await createBrandAccount(brandId)).id;
      await admin.from('brands').update({ stripe_account_id: account }).eq('id', brandId);
    }
    const session = await stripe().accountSessions.create({ account, components: { account_onboarding: { enabled: true, features: { external_account_collection: true } } } });
    return { clientSecret: session.client_secret };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not start payout setup.' };
  }
}

export async function refreshBrandPayoutStatus(): Promise<ActionState> {
  if (isDemo) return undefined;
  const brandId = await requireBrand();
  const admin = createAdminClient();
  const { data: brand } = await admin.from('brands').select('stripe_account_id').eq('id', brandId).single();
  if (!brand?.stripe_account_id) return undefined;
  const account = await stripe().accounts.retrieve(brand.stripe_account_id as string);
  await admin.from('brands').update({ payouts_enabled: account.payouts_enabled ?? false }).eq('id', brandId);
  revalidatePath('/streamer/invite');
  return account.payouts_enabled ? { success: 'Payouts are on.' } : undefined;
}
