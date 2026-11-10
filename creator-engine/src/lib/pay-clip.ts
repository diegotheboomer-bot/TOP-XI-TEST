import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from './stripe';
import { sendPayPalPayout, paypalConfigured } from './paypal';
import { PAYOUT_METHOD_LABEL, payoutReady, type PayoutMethod } from './payout-methods';
import { usdCents } from './format';

export type PayResult = { ok: true; gross: number; via: string; campaignId: string } | { ok: false; error: string };

/**
 * Pays out everything a clip has earned but not yet been sent:
 * claim → debit escrow (atomic) → Stripe Transfer or PayPal/Venmo payout → ledger row.
 * Each failed step reverses the ones before it. Used by the streamer's Pay button
 * and by the automatic payouts in the sync. `minimum` is the smallest amount to send.
 */
export async function payClip(admin: SupabaseClient, submissionId: string, minimum = 1, fee = 0): Promise<PayResult> {
  const { data: sub } = await admin
    .from('submissions')
    .select('id, campaign_id, creator_id, status, payout_earned, payout_transferred, creators(stripe_account_id, payouts_enabled), campaigns(cpm_cap)')
    .eq('id', submissionId)
    .single();
  if (!sub) return { ok: false, error: 'Submission not found.' };

  const creator = sub.creators as unknown as { stripe_account_id: string | null; payouts_enabled: boolean };
  if (sub.status !== 'live_tracking') return { ok: false, error: 'Only approved, unflagged submissions can be paid.' };
  const { data: method } = await admin.from('payout_methods').select('method, handle').eq('creator_id', sub.creator_id).maybeSingle();
  const setup = {
    method: (method?.method ?? 'stripe') as PayoutMethod,
    handle: (method?.handle as string | null) ?? null,
    stripeReady: !!creator.stripe_account_id && creator.payouts_enabled,
    lastFailure: null,
  };
  if (!payoutReady(setup)) return { ok: false, error: 'Creator has not finished payout setup.' };
  if (setup.method !== 'stripe' && !paypalConfigured()) return { ok: false, error: 'PayPal payouts aren’t configured on this platform.' };

  const gross = Math.round((Number(sub.payout_earned) - Number(sub.payout_transferred)) * 100) / 100;
  if (gross < minimum) return { ok: false, error: 'Nothing to pay out yet.' };

  if (fee >= gross) return { ok: false, error: 'Amount is too small to cover the cash-out fee.' };
  const sent = Math.round((gross - fee) * 100) / 100;
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

  // 3. Send it the clipper's chosen way. No fee, except an extra cash-out's small fee
  // (kept by the platform from this amount).
  let externalId: string;
  try {
    if (setup.method === 'stripe') {
      const transfer = await stripe().transfers.create(
        { amount: Math.round(sent * 100), currency: 'usd', destination: creator.stripe_account_id!, transfer_group: `campaign_${sub.campaign_id}`, metadata: { submission_id: sub.id, cashout_fee: String(fee) } },
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
  if (after >= Number((sub.campaigns as unknown as { cpm_cap: number }).cpm_cap)) {
    await admin.from('submissions').update({ status: 'paid' }).eq('id', sub.id);
  }
  return { ok: true, gross: sent, via: setup.method === 'stripe' ? 'their bank' : PAYOUT_METHOD_LABEL[setup.method], campaignId: sub.campaign_id };
}
