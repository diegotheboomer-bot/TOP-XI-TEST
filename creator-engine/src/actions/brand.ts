'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isDemo, appUrl } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, platformFeePercent } from '@/lib/stripe';
import { splitFee } from '@/lib/payout';
import * as demo from '@/lib/demo';
import type { ActionState } from './result';

async function requireBrand() {
  const viewer = await getViewer();
  if (!viewer?.brandId) throw new Error('Sign in as a brand first.');
  return viewer.brandId;
}

async function requireOwnCampaign(campaignId: string) {
  const brandId = await requireBrand();
  const admin = createAdminClient();
  const { data } = await admin.from('campaigns').select('*').eq('id', campaignId).eq('brand_id', brandId).maybeSingle();
  if (!data) throw new Error('Campaign not found.');
  return { admin, campaign: data, brandId };
}

const money = (max: number) => z.coerce.number().min(0).max(max).multipleOf(0.01);

const CampaignSchema = z
  .object({
    title: z.string().trim().min(3).max(255),
    payout_model: z.enum(['hybrid', 'pure_cpm', 'cps_performance']),
    base_payout: money(99_999_999),
    cpm_rate: money(9_999),
    cpm_cap: money(99_999_999).refine((n) => n > 0, 'Set a payout cap above $0'),
    cps_commission_pct: z.coerce.number().min(0).max(100),
    code_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/, 'Code prefix: 2–12 letters or digits'),
    asset_folder_url: z.union([z.literal(''), z.string().url()]),
  })
  .refine((c) => c.cpm_cap >= c.base_payout, { message: 'The cap must be at least the base payout.' });

export async function createCampaign(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = CampaignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (isDemo) {
    const { asset_folder_url, ...rest } = parsed.data;
    redirect(`/brand/campaigns/${demo.createCampaign({ ...rest, asset_folder_url: asset_folder_url || null })}`);
  }

  const brandId = await requireBrand();
  const { asset_folder_url, ...rest } = parsed.data;
  const { data, error } = await createAdminClient()
    .from('campaigns')
    .insert({ ...rest, asset_folder_url: asset_folder_url || null, brand_id: brandId })
    .select('id')
    .single();
  if (error) return { error: error.message };
  redirect(`/brand/campaigns/${data.id}`);
}

export async function setCampaignStatus(campaignId: string, status: 'active' | 'paused' | 'completed'): Promise<ActionState> {
  if (isDemo) return done(demo.setCampaignStatus(campaignId, status), campaignId);
  const { admin, campaign } = await requireOwnCampaign(campaignId);
  if (status === 'active' && Number(campaign.escrow_balance) <= 0) return { error: 'Fund escrow before going live.' };
  await admin.from('campaigns').update({ status }).eq('id', campaignId);
  revalidatePath(`/brand/campaigns/${campaignId}`);
  return { success: `Campaign ${status}.` };
}

/** Brand deposit → Stripe Checkout (creates a PaymentIntent). Escrow is credited by the webhook. */
export async function fundEscrow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const campaignId = String(form.get('campaignId'));
  const amount = z.coerce.number().min(50).max(1_000_000).safeParse(form.get('amount'));
  if (!amount.success) return { error: 'Deposit between $50 and $1,000,000.' };
  if (isDemo) return done(demo.fundEscrow(campaignId, amount.data), campaignId);
  const { campaign } = await requireOwnCampaign(campaignId);

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: Math.round(amount.data * 100), product_data: { name: `Escrow — ${campaign.title}` } },
      },
    ],
    metadata: { campaign_id: campaignId },
    payment_intent_data: { metadata: { campaign_id: campaignId }, transfer_group: `campaign_${campaignId}` },
    success_url: `${appUrl()}/brand/campaigns/${campaignId}?funded=1`,
    cancel_url: `${appUrl()}/brand/campaigns/${campaignId}`,
  });
  redirect(session.url!);
}

export async function connectStore(_prev: ActionState, form: FormData): Promise<ActionState> {
  const domain = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/, 'Use your store’s myshopify.com domain')
    .safeParse(form.get('shopDomain'));
  if (!domain.success) return { error: domain.error.issues[0].message };
  const campaignId = String(form.get('campaignId'));
  if (isDemo) return done(demo.connectStore(campaignId, domain.data), campaignId);
  const { admin, brandId } = await requireOwnCampaign(campaignId);

  const { data: existing } = await admin.from('conversion_pixels').select('id').eq('brand_id', brandId).eq('shop_domain', domain.data).maybeSingle();
  const pixelId =
    existing?.id ??
    (await admin.from('conversion_pixels').insert({ brand_id: brandId, name: domain.data, shop_domain: domain.data }).select('id').single()).data?.id;
  await admin.from('campaigns').update({ pixel_id: pixelId }).eq('id', campaignId);
  revalidatePath(`/brand/campaigns/${campaignId}`);
  return { success: 'Store connected. Point your Shopify orders/create webhook at /api/webhooks/shopify.' };
}

export async function reviewSubmission(submissionId: string, decision: 'approve' | 'flag'): Promise<ActionState> {
  if (isDemo) return done(demo.reviewSubmission(submissionId, decision));
  const admin = createAdminClient();
  const { data: sub } = await admin.from('submissions').select('campaign_id, status').eq('id', submissionId).single();
  if (!sub) return { error: 'Submission not found.' };
  await requireOwnCampaign(sub.campaign_id);

  const update =
    decision === 'approve'
      ? { status: 'live_tracking', flag_reason: null, fraud_score: 0 }
      : { status: 'flagged', flag_reason: 'Flagged by brand review' };
  await admin.from('submissions').update(update).eq('id', submissionId);
  revalidatePath(`/brand/campaigns/${sub.campaign_id}`);
  return { success: decision === 'approve' ? 'Approved — tracking started.' : 'Flagged.' };
}

/**
 * Pays out everything earned but not yet transferred:
 * claim → debit escrow (atomic) → Stripe Transfer of the net → ledger rows.
 * Each failed step reverses the ones before it.
 */
export async function releasePayout(submissionId: string): Promise<ActionState> {
  if (isDemo) return done(demo.releasePayout(submissionId));
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('submissions')
    .select('id, campaign_id, status, payout_earned, payout_transferred, creators(stripe_account_id, payouts_enabled), campaigns(cpm_cap)')
    .eq('id', submissionId)
    .single();
  if (!sub) return { error: 'Submission not found.' };
  await requireOwnCampaign(sub.campaign_id);

  const creator = sub.creators as unknown as { stripe_account_id: string | null; payouts_enabled: boolean };
  if (sub.status !== 'live_tracking') return { error: 'Only approved, unflagged submissions can be paid.' };
  if (!creator.stripe_account_id || !creator.payouts_enabled) return { error: 'Creator has not finished payout setup.' };

  const gross = Math.round((Number(sub.payout_earned) - Number(sub.payout_transferred)) * 100) / 100;
  if (gross < 1) return { error: 'Nothing to pay out yet.' };

  const before = Number(sub.payout_transferred);
  const after = Math.round((before + gross) * 100) / 100;

  // 1. Claim: only one concurrent call can move payout_transferred from `before`.
  const { data: claimed } = await admin
    .from('submissions')
    .update({ payout_transferred: after })
    .eq('id', sub.id)
    .eq('payout_transferred', before)
    .select('id');
  if (!claimed?.length) return { error: 'A payout for this submission is already in progress.' };
  const unclaim = () => admin.from('submissions').update({ payout_transferred: before }).eq('id', sub.id).eq('payout_transferred', after);

  // 2. Debit escrow atomically (fails instead of overdrawing).
  const { data: debited } = await admin.rpc('escrow_debit', { p_campaign: sub.campaign_id, p_amount: gross });
  if (!debited) {
    await unclaim();
    return { error: 'Not enough escrow — top up the campaign first.' };
  }

  // 3. Transfer the creator's share; the platform fee stays in the platform balance.
  const { net, fee } = splitFee(gross, platformFeePercent());
  let transferId: string;
  try {
    const transfer = await stripe().transfers.create(
      {
        amount: Math.round(net * 100),
        currency: 'usd',
        destination: creator.stripe_account_id,
        transfer_group: `campaign_${sub.campaign_id}`,
        metadata: { submission_id: sub.id },
      },
      { idempotencyKey: `payout_${sub.id}_${before}` },
    );
    transferId = transfer.id;
  } catch (e) {
    await admin.rpc('escrow_credit', { p_campaign: sub.campaign_id, p_amount: gross });
    await unclaim();
    return { error: `Stripe transfer failed: ${e instanceof Error ? e.message : 'unknown error'}` };
  }

  // 4. Ledger + close out once the cap is fully paid.
  await admin.from('escrow_ledger').insert([
    { campaign_id: sub.campaign_id, submission_id: sub.id, entry_type: 'creator_payout', amount: net, stripe_object_id: transferId },
    { campaign_id: sub.campaign_id, submission_id: sub.id, entry_type: 'platform_fee', amount: fee, stripe_object_id: transferId },
  ]);
  if (after >= Number((sub.campaigns as unknown as { cpm_cap: number }).cpm_cap)) {
    await admin.from('submissions').update({ status: 'paid' }).eq('id', sub.id);
  }

  revalidatePath(`/brand/campaigns/${sub.campaign_id}`);
  return { success: `Paid ${net.toFixed(2)} to creator (${fee.toFixed(2)} platform fee).` };
}

// ─── Demo-only simulations ───────────────────────────────────────────────
export async function simulateSync(campaignId: string): Promise<ActionState> {
  if (!isDemo) return { error: 'Only available in demo mode.' };
  return done(demo.simulateSync(campaignId), campaignId);
}

export async function simulateSale(campaignId: string): Promise<ActionState> {
  if (!isDemo) return { error: 'Only available in demo mode.' };
  return done(demo.simulateSale(campaignId), campaignId);
}

function done(result: ActionState, campaignId?: string): ActionState {
  revalidatePath(campaignId ? `/brand/campaigns/${campaignId}` : '/brand', campaignId ? 'page' : 'layout');
  return result;
}
