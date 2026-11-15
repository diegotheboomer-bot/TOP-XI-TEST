import type Stripe from 'stripe';
import { clipperTier } from './clipper-records';
import { payoutFee } from './tiers';
import { isTestClip } from './test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from './stripe';
import { sendPayPalPayout, paypalConfigured } from './paypal';
import { PAYOUT_METHOD_LABEL, payoutReady, type PayoutMethod } from './payout-methods';
import { usdCents } from './format';
import { creditReferral } from './referrals';

export type PayResult = { ok: true; gross: number; via: string; campaignId: string } | { ok: false; error: string };

/**
 * Pays out everything a clip has earned but not yet been sent:
 * claim → debit escrow (atomic) → Stripe Transfer or PayPal/Venmo payout → ledger row.
 * Each failed step reverses the ones before it. Used by the streamer's Pay button
 * and by cash-outs. `minimum` is the smallest amount to send. `stripeCost` is Stripe's payout
 * charge, taken from this clip's payment once per cash-out (see payout-costs.ts).
 */
export async function payClip(admin: SupabaseClient, submissionId: string, minimum = 0.01, maxGross?: number, stripeCost = 0): Promise<PayResult> {
  const { data: sub } = await admin
    .from('submissions')
    .select('id, campaign_id, creator_id, status, payout_earned, payout_transferred, social_platform_video_id, campaigns(cpm_cap, payout_model, status)')
    .eq('id', submissionId)
    .single();
  if (!sub) return { ok: false, error: 'Submission not found.' };
  if (isTestClip(sub)) return { ok: false, error: 'This is test data, so nothing is paid out.' };

  // Looked up on its own: submissions reference campaign_creators, so creators can't be embedded.
  const { data: creatorRow } = await admin.from('creators').select('stripe_account_id, payouts_enabled').eq('id', sub.creator_id).maybeSingle();
  const creator = { stripe_account_id: (creatorRow?.stripe_account_id as string | null) ?? null, payouts_enabled: !!creatorRow?.payouts_enabled };
  if (sub.status !== 'live_tracking') return { ok: false, error: 'Only approved, unflagged submissions can be paid.' };
  const camp = sub.campaigns as unknown as { cpm_cap: number; payout_model: string; status: string };
  if (camp.payout_model === 'pool' && camp.status !== 'completed') return { ok: false, error: 'Pool campaigns are paid when they end.' };
  const { data: method } = await admin.from('payout_methods').select('method, handle').eq('creator_id', sub.creator_id).maybeSingle();
  const setup = {
    method: (method?.method ?? 'stripe') as PayoutMethod,
    handle: (method?.handle as string | null) ?? null,
    stripeReady: !!creator.stripe_account_id && creator.payouts_enabled,
    lastFailure: null,
  };
  if (!payoutReady(setup)) return { ok: false, error: 'Creator has not finished payout setup.' };
  if (setup.method !== 'stripe' && !paypalConfigured()) return { ok: false, error: 'PayPal payouts aren’t configured on this platform.' };

  // Everything owed, or less when the clipper chose to cash out only part of their balance.
  const owed = Math.round((Number(sub.payout_earned) - Number(sub.payout_transferred)) * 100) / 100;
  const gross = maxGross == null ? owed : Math.min(owed, Math.floor(maxGross * 100) / 100);
  if (gross < minimum) return { ok: false, error: 'Nothing to pay out yet.' };

  // The platform's fee depends on the clipper's tier (5%, see tiers.ts).
  const tier = await clipperTier(admin, sub.creator_id as string);
  const fee = payoutFee(gross, tier);
  if (fee + stripeCost >= gross) return { ok: false, error: 'Amount is too small to pay out.' };
  const sent = Math.round((gross - fee - stripeCost) * 100) / 100;
  const before = Number(sub.payout_transferred);
  const after = Math.round((before + gross) * 100) / 100;

  // 1. Claim: only one concurrent call can move payout_transferred from `before`.
  const { data: claimed } = await admin.from('submissions').update({ payout_transferred: after }).eq('id', sub.id).eq('payout_transferred', before).select('id');
  if (!claimed?.length) return { ok: false, error: 'A payout for this submission is already in progress.' };
  const unclaim = () => admin.from('submissions').update({ payout_transferred: before }).eq('id', sub.id).eq('payout_transferred', after);

  // 2. Debit escrow atomically (fails instead of overdrawing).
  const { data: debited } = await admin.rpc('escrow_debit', { p_campaign: sub.campaign_id, p_amount: gross });
  if (!debited) {
    await unclaim();
    return { ok: false, error: 'Not enough escrow. Top up the campaign first.' };
  }

  // 3. Send it the clipper's chosen way, minus the tier fee (kept by the platform).
  let externalId: string;
  try {
    if (setup.method === 'stripe') {
      const transfer = await transferFromDeposits(admin, sub.campaign_id as string, `payout_${sub.id}_${before}`, {
        amount: Math.round(sent * 100),
        currency: 'usd',
        destination: creator.stripe_account_id!,
        metadata: { submission_id: sub.id, platform_fee: String(fee), stripe_cost: String(stripeCost), tier },
      });
      externalId = transfer.id;
    } else {
      // Unique per payout; PayPal echoes it in webhooks so a returned payout can be undone.
      const senderItemId = `${sub.id}_${Math.round(before * 100)}`;
      await sendPayPalPayout({ senderItemId, amount: sent, wallet: setup.method === 'venmo' ? 'VENMO' : 'PAYPAL', receiver: setup.handle!, note: `Clip earnings: ${usdCents(sent)}` });
      externalId = `paypal:${senderItemId}`;
    }
  } catch (e) {
    await admin.rpc('escrow_credit', { p_campaign: sub.campaign_id, p_amount: gross });
    await unclaim();
    const via = setup.method === 'stripe' ? 'Stripe transfer' : `${PAYOUT_METHOD_LABEL[setup.method]} payout`;
    return { ok: false, error: `${via} failed: ${e instanceof Error ? e.message : 'unknown error'}` };
  }

  // 4. Ledger + close out once the cap is fully paid.
  await admin.from('escrow_ledger').insert({ campaign_id: sub.campaign_id, submission_id: sub.id, entry_type: 'creator_payout', amount: gross, stripe_object_id: externalId });
  // Kept by the platform: the 5% fee plus Stripe's payout charge, which the platform pays Stripe.
  if (fee + stripeCost > 0) await admin.from('escrow_ledger').insert({ campaign_id: sub.campaign_id, submission_id: sub.id, entry_type: 'platform_fee', amount: Math.round((fee + stripeCost) * 100) / 100, stripe_object_id: externalId });
  // Invited in the last 90 days: the fee goes to whoever invited them.
  await creditReferral(admin, { creatorId: sub.creator_id as string, submissionId: sub.id as string, campaignId: sub.campaign_id as string, fee, sourceRef: externalId });
  if (after >= Number((sub.campaigns as unknown as { cpm_cap: number }).cpm_cap)) {
    await admin.from('submissions').update({ status: 'paid' }).eq('id', sub.id);
  }
  return { ok: true, gross: sent, via: setup.method === 'stripe' ? 'their bank' : PAYOUT_METHOD_LABEL[setup.method], campaignId: sub.campaign_id };
}

/**
 * Sends a transfer tied to one of the campaign's card deposits (`source_transaction`), so it works even while
 * that deposit is still pending in Stripe: Stripe holds the money until the deposit clears, then releases it.
 * Tries the newest deposits first; if none fits (amount or currency), falls back to the platform's available balance.
 * https://docs.stripe.com/connect/separate-charges-and-transfers#transfer-availability
 */
async function transferFromDeposits(
  admin: SupabaseClient,
  campaignId: string,
  key: string,
  params: { amount: number; currency: string; destination: string; metadata: Record<string, string> },
) {
  // This campaign's card deposits first, then the business's other campaigns' (budget moved here as Atlas credit
  // or invite earnings still comes from one of the business's own card payments).
  const { data: camp } = await admin.from('campaigns').select('brand_id').eq('id', campaignId).maybeSingle();
  const { data: siblings } = await admin.from('campaigns').select('id').eq('brand_id', camp?.brand_id ?? '');
  const ids = [campaignId, ...(siblings ?? []).map((c) => c.id as string).filter((id) => id !== campaignId)];
  const { data: rows } = await admin.from('escrow_ledger').select('campaign_id, stripe_object_id, created_at').in('campaign_id', ids).eq('entry_type', 'deposit').like('stripe_object_id', 'pi_%').order('created_at', { ascending: false }).limit(20);
  const deposits = (rows ?? []).sort((a, b) => Number(b.campaign_id === campaignId) - Number(a.campaign_id === campaignId));
  const reasons: string[] = deposits.length ? [] : ['no card deposit found for this business'];
  for (const d of deposits) {
    try {
      const intent = await stripe().paymentIntents.retrieve(d.stripe_object_id as string, { expand: ['latest_charge.balance_transaction'] });
      const charge = intent.latest_charge as Stripe.Charge | null;
      if (!charge || typeof charge === 'string') {
        reasons.push(`${d.stripe_object_id}: no charge`);
        continue;
      }
      // Stripe requires the transfer in the currency the deposit settled in (EUR unless USD settlement is on).
      // Convert at the deposit's own rate, so the clipper gets the same value.
      const bt = charge.balance_transaction as Stripe.BalanceTransaction | null;
      const currency = bt && typeof bt !== 'string' ? bt.currency : charge.currency;
      const amount = currency === params.currency || !bt || typeof bt === 'string' ? params.amount : Math.floor((params.amount * bt.amount) / charge.amount);
      if (amount < 1) {
        reasons.push(`${charge.id}: amount too small`);
        continue;
      }
      return await stripe().transfers.create({ ...params, amount, currency, source_transaction: charge.id }, { idempotencyKey: `${key}_${charge.id}_${currency}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      reasons.push(msg);
      console.warn('Transfer from deposit refused:', msg);
      // Only a refused request (too big for this deposit, a currency mismatch, a refunded charge) moves on.
      // Anything else (a network error) stops, so a transfer can never be sent twice.
      if ((err as { type?: string })?.type !== 'StripeInvalidRequestError') throw err;
    }
  }
  try {
    return await stripe().transfers.create({ ...params, transfer_group: `campaign_${campaignId}` }, { idempotencyKey: key });
  } catch (err) {
    // Say why the deposit-linked transfer didn't work too, so it can be fixed.
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(reasons.length ? `${msg} (deposit link: ${reasons.join('; ')})` : msg);
  }
}
