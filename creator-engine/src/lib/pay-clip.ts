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

  // The platform's fee depends on the clipper's tier (2%, see tiers.ts).
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
      const transfer = await stripe().transfers.create(
        { amount: Math.round(sent * 100), currency: 'usd', destination: creator.stripe_account_id!, transfer_group: `campaign_${sub.campaign_id}`, metadata: { submission_id: sub.id, platform_fee: String(fee), stripe_cost: String(stripeCost), tier } },
        { idempotencyKey: `payout_${sub.id}_${before}` },
      );
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
  // Kept by the platform: the 2% fee plus Stripe's payout charge, which the platform pays Stripe.
  if (fee + stripeCost > 0) await admin.from('escrow_ledger').insert({ campaign_id: sub.campaign_id, submission_id: sub.id, entry_type: 'platform_fee', amount: Math.round((fee + stripeCost) * 100) / 100, stripe_object_id: externalId });
  // Invited in the last 90 days: the fee goes to whoever invited them.
  await creditReferral(admin, { creatorId: sub.creator_id as string, submissionId: sub.id as string, fee, sourceRef: externalId });
  if (after >= Number((sub.campaigns as unknown as { cpm_cap: number }).cpm_cap)) {
    await admin.from('submissions').update({ status: 'paid' }).eq('id', sub.id);
  }
  return { ok: true, gross: sent, via: setup.method === 'stripe' ? 'their bank' : PAYOUT_METHOD_LABEL[setup.method], campaignId: sub.campaign_id };
}
