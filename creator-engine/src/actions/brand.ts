'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripe, platformFeePercent, achEnabled, feeFor } from '@/lib/stripe';
import { streamerCharge } from '@/lib/payout';
import { planRefunds } from '@/lib/refunds';
import { payClip } from '@/lib/pay-clip';
import { HOLD_HOURS, streamerCanFlag } from '@/lib/payout-rules';
import type Stripe from 'stripe';
import { usdCents } from '@/lib/format';
import { CampaignSchema, DepositSchema, MomentSchema, ShopDomainSchema, campaignInput, thumbnailError, CampaignEditSchema } from '@/lib/schemas';
import * as demo from '@/lib/demo';
import { REF_MAX_BYTES } from '@/lib/references';
import { LOW_ENGAGEMENT_REASON } from '@/lib/fraud';
import { clipperTier } from '@/lib/clipper-records';
import { TIER_PERKS, holdLabel } from '@/lib/tiers';
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

export async function createCampaign(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = CampaignSchema.safeParse(campaignInput(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const file = form.get('thumbnail');
  const thumb = file instanceof File && file.size > 0 ? file : null;
  if (!thumb) return { error: 'Add a thumbnail for your campaign.' };
  const thumbError = thumbnailError(thumb);
  if (thumbError) return { error: thumbError };
  // The budget picked in setup pre-fills the payment screen; it isn't charged here.
  const budget = Math.round(Number(form.get('budget')) || 0);
  const fund = budget >= 50 ? `?fund=${Math.min(budget, 1_000_000)}` : '';

  const { asset_folder_url, ...rest } = parsed.data;
  const row = { ...rest, asset_folder_url: asset_folder_url || null };

  if (isDemo) {
    const thumbnail_url = `data:${thumb.type};base64,${Buffer.from(await thumb.arrayBuffer()).toString('base64')}`;
    redirect(`/streamer/campaigns/${demo.createCampaign({ ...row, thumbnail_url })}${fund}`);
  }

  const brandId = await requireBrand();
  const admin = createAdminClient();
  const ext = thumb.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${brandId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from('campaign-thumbnails').upload(path, thumb, { contentType: thumb.type });
  if (upErr) return { error: `Thumbnail upload failed: ${upErr.message}` };
  const thumbnail_url = admin.storage.from('campaign-thumbnails').getPublicUrl(path).data.publicUrl;

  const { data, error } = await admin
    .from('campaigns')
    .insert({ ...row, thumbnail_url, brand_id: brandId })
    .select('id')
    .single();
  if (error) return { error: error.message };
  redirect(`/streamer/campaigns/${data.id}${fund}`);
}

export async function updateCampaign(campaignId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  const parsed = CampaignEditSchema.safeParse({ ...fields, category: fields.category || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const file = form.get('thumbnail');
  const thumb = file instanceof File && file.size > 0 ? file : null;
  const thumbError = thumbnailError(thumb);
  if (thumbError) return { error: thumbError };
  const changes: Record<string, unknown> = { ...parsed.data, asset_folder_url: parsed.data.asset_folder_url || null };
  if (isDemo) return { error: 'Editing is off in the demo.' };

  const { admin, brandId } = await requireOwnCampaign(campaignId);
  if (thumb) {
    const ext = thumb.type.split('/')[1].replace('jpeg', 'jpg');
    const path = `${brandId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from('campaign-thumbnails').upload(path, thumb, { contentType: thumb.type });
    if (upErr) return { error: `Thumbnail upload failed: ${upErr.message}` };
    changes.thumbnail_url = admin.storage.from('campaign-thumbnails').getPublicUrl(path).data.publicUrl;
  }
  const { error } = await admin.from('campaigns').update(changes).eq('id', campaignId);
  if (error) return { error: error.message };
  revalidatePath(`/streamer/campaigns/${campaignId}`);
  redirect(`/streamer/campaigns/${campaignId}?saved=1`);
}

/**
 * A one-time URL the browser uploads a reference file to directly, so large
 * videos don't pass through the server. Returns the file's public URL too.
 */
export async function referenceUploadUrl(name: string, size: number): Promise<{ error: string } | { uploadUrl: string; publicUrl: string }> {
  if (isDemo) return { error: 'Uploads are off in the demo. Add a link instead.' };
  if (size > REF_MAX_BYTES) return { error: `${name} is over 50 MB. Upload it to Drive or YouTube and add the link.` };
  const brandId = await requireBrand();
  const ext = (name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
  const path = `${brandId}/${crypto.randomUUID()}.${ext}`;
  const store = createAdminClient().storage.from('campaign-references');
  const { data, error } = await store.createSignedUploadUrl(path);
  if (error) return { error: `Upload failed: ${error.message}` };
  return { uploadUrl: data.signedUrl, publicUrl: store.getPublicUrl(path).data.publicUrl };
}

export async function setCampaignStatus(campaignId: string, status: 'active' | 'paused' | 'completed'): Promise<ActionState> {
  if (isDemo) return done(demo.setCampaignStatus(campaignId, status), campaignId);
  const { admin, campaign } = await requireOwnCampaign(campaignId);
  if (campaign.status === 'completed') return { error: 'This campaign has ended.' };
  if (status === 'active' && Number(campaign.escrow_balance) <= 0) return { error: 'Add a budget before launching.' };
  if (status === 'active' && campaign.invite_only) {
    const { count } = await admin.from('campaign_invites').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId);
    if (!count) return { error: 'This campaign is invite only. Invite at least one clipper from Scout first.' };
  }
  await admin.from('campaigns').update({ status }).eq('id', campaignId);
  revalidatePath(`/streamer/campaigns/${campaignId}`);
  return { success: status === 'active' ? 'Your campaign is live.' : status === 'paused' ? 'Campaign paused.' : 'Campaign ended.' };
}

export type DepositIntentResult = { clientSecret: string } | { error: string };

/**
 * Step 2 of the in-app checkout: the Payment Element has validated the card,
 * so create the PaymentIntent for budget + fee. The amount is recomputed here,
 * never taken from the browser. The webhook (payment_intent.succeeded) credits
 * only the budget to escrow.
 */
export async function createDepositIntent(campaignId: string, amount: number): Promise<DepositIntentResult> {
  const parsed = DepositSchema.safeParse(amount);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (isDemo) return { error: 'Stripe is off in demo mode.' };
  const { campaign, admin, brandId } = await requireOwnCampaign(campaignId);
  if (campaign.status === 'completed') return { error: 'This campaign has ended.' };
  const { data: brand } = await admin.from('brands').select('early_partner').eq('id', brandId).single();
  const plan = feeFor(!!brand?.early_partner);
  const fee = plan.percent;
  const charge = streamerCharge(parsed.data, plan.percent, plan.fixed);
  const cents = (n: number) => Math.round(n * 100);
  try {
    const intent = await stripe().paymentIntents.create({
      amount: cents(charge.total),
      currency: 'usd',
      // Card (Apple Pay and Google Pay are card wallets) or US bank account (ACH: about 0.8%, capped at $5).
      allowed_payment_method_types: achEnabled() ? ['card', 'us_bank_account'] : ['card'],
      description: `Clipper budget ${usdCents(charge.budget)} + ${plan.early ? 'card processing' : `${fee}% service fee`}: ${campaign.title}`,
      metadata: { kind: 'campaign_deposit', campaign_id: campaignId, budget_cents: String(cents(charge.budget)), fee_cents: String(cents(charge.fee)) },
      transfer_group: `campaign_${campaignId}`,
    });
    return { clientSecret: intent.client_secret! };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not start the payment.' };
  }
}

/** Demo checkout: adds mock money straight away. */
export async function payDemoDeposit(campaignId: string, amount: number): Promise<ActionState> {
  const parsed = DepositSchema.safeParse(amount);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isDemo) return { error: 'Use the Stripe checkout.' };
  return done(demo.fundEscrow(campaignId, parsed.data), campaignId);
}

/**
 * Ends the campaign and refunds the unspent budget to the streamer's card.
 * Status goes to completed first, so the sync stops growing earnings; money
 * earned by approved clips stays reserved for payouts. The platform fee is
 * not refunded. On an ended campaign it refunds whatever has been freed since
 * (e.g. a flagged clip). Order: debit escrow (atomic) → Stripe refunds per
 * deposit → ledger rows; anything Stripe doesn't take goes back to escrow.
 */
export async function cancelCampaign(campaignId: string): Promise<ActionState> {
  if (isDemo) return done(demo.cancelCampaign(campaignId), campaignId);
  const { admin, campaign } = await requireOwnCampaign(campaignId);
  const wasLive = campaign.status !== 'completed';
  if (wasLive) await admin.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);

  const { data: subs } = await admin.from('submissions').select('payout_earned, payout_transferred').eq('campaign_id', campaignId).eq('status', 'live_tracking');
  const owed = (subs ?? []).reduce((a, x) => a + Number(x.payout_earned) - Number(x.payout_transferred), 0);
  const { data: fresh } = await admin.from('campaigns').select('escrow_balance').eq('id', campaignId).single();
  const escrowCents = Math.round(Number(fresh?.escrow_balance ?? 0) * 100);
  const refundCents = Math.max(0, escrowCents - Math.ceil(owed * 100));
  const ended = wasLive ? 'Campaign cancelled. ' : '';
  if (refundCents === 0) return done({ success: `${ended}Nothing left to refund.` }, campaignId);

  const { data: debited } = await admin.rpc('escrow_debit', { p_campaign: campaignId, p_amount: refundCents / 100 });
  if (!debited) return done({ error: `${ended}The budget changed while refunding. Try again.` }, campaignId);

  // Deposits made through the in-app checkout, newest first.
  const { data: deposits } = await admin
    .from('escrow_ledger')
    .select('amount, stripe_object_id')
    .eq('campaign_id', campaignId)
    .eq('entry_type', 'deposit')
    .like('stripe_object_id', 'pi_%')
    .order('created_at', { ascending: false });
  let refunded = 0;
  let failure: string | null = null;
  try {
    const refundable = [];
    for (const d of deposits ?? []) {
      const intent = await stripe().paymentIntents.retrieve(d.stripe_object_id as string, { expand: ['latest_charge'] });
      const charge = intent.latest_charge as Stripe.Charge | null;
      refundable.push({ id: intent.id, refundableCents: Math.round(Number(d.amount) * 100) - (charge?.amount_refunded ?? 0) });
    }
    for (const part of planRefunds(refundable, refundCents)) {
      const refund = await stripe().refunds.create({ payment_intent: part.id, amount: part.cents, metadata: { kind: 'campaign_refund', campaign_id: campaignId } });
      refunded += part.cents;
      await admin.from('escrow_ledger').insert({ campaign_id: campaignId, entry_type: 'refund', amount: part.cents / 100, stripe_object_id: refund.id });
    }
  } catch (err) {
    failure = err instanceof Error ? err.message : 'Stripe refund failed.';
  }
  // Whatever wasn't refunded stays in the campaign.
  if (refunded < refundCents) await admin.rpc('escrow_credit', { p_campaign: campaignId, p_amount: (refundCents - refunded) / 100 });

  const back = refunded ? `${usdCents(refunded / 100)} is on its way back to your card (5–10 business days). ` : '';
  if (failure) return done({ error: `${ended}${back}The rest couldn’t be refunded: ${failure}` }, campaignId);
  if (refunded < refundCents) return done({ error: `${ended}${back}${usdCents((refundCents - refunded) / 100)} couldn’t be matched to a card payment. Contact support.` }, campaignId);
  return done({ success: `${ended}${back.trim()}` }, campaignId);
}

export async function connectStore(_prev: ActionState, form: FormData): Promise<ActionState> {
  const domain = ShopDomainSchema.safeParse(form.get('shopDomain'));
  if (!domain.success) return { error: domain.error.issues[0].message };
  const campaignId = String(form.get('campaignId'));
  if (isDemo) return done(demo.connectStore(campaignId, domain.data), campaignId);
  const { admin, brandId } = await requireOwnCampaign(campaignId);

  const { data: existing } = await admin.from('conversion_pixels').select('id').eq('brand_id', brandId).eq('shop_domain', domain.data).maybeSingle();
  const pixelId =
    existing?.id ??
    (await admin.from('conversion_pixels').insert({ brand_id: brandId, name: domain.data, shop_domain: domain.data }).select('id').single()).data?.id;
  await admin.from('campaigns').update({ pixel_id: pixelId }).eq('id', campaignId);
  revalidatePath(`/streamer/campaigns/${campaignId}`);
  return { success: 'Store connected. Point your Shopify orders/create webhook at /api/webhooks/shopify.' };
}

export async function reviewSubmission(submissionId: string, decision: 'approve' | 'flag'): Promise<ActionState> {
  if (isDemo) return done(demo.reviewSubmission(submissionId, decision));
  const admin = createAdminClient();
  const { data: sub } = await admin.from('submissions').select('campaign_id, creator_id, status, approved_at, flag_reason').eq('id', submissionId).single();
  if (!sub) return { error: 'Submission not found.' };
  const { campaign } = await requireOwnCampaign(sub.campaign_id);
  if (decision === 'approve' && campaign.status === 'completed') return { error: 'This campaign has ended, so new clips can’t earn.' };
  if (decision === 'flag') {
    const hold = TIER_PERKS[await clipperTier(admin, sub.creator_id as string)].holdHours;
    if (!streamerCanFlag(sub as { status: 'pending_review'; approved_at: string | null }, Date.now(), hold)) {
      return { error: `Clips can only be flagged for ${holdLabel(hold)} after approval. This one is locked and will be paid.` };
    }
  }

  const update =
    decision === 'approve'
      ? {
          status: 'live_tracking',
          flag_reason: null,
          fraud_score: 0,
          approved_at: new Date().toISOString(),
          // Approving a low-engagement hold means the streamer checked it.
          ...(sub.flag_reason?.startsWith(LOW_ENGAGEMENT_REASON) ? { engagement_cleared: true } : {}),
        }
      : { status: 'flagged', flag_reason: 'Flagged by the streamer' };
  await admin.from('submissions').update(update).eq('id', submissionId);
  revalidatePath(`/streamer/campaigns/${sub.campaign_id}`);
  return { success: decision === 'approve' ? 'Approved. Tracking started.' : 'Flagged.' };
}

/**
 * The streamer pays a clip early. (Approved clips are also paid automatically
 * once the hold has passed; see lib/payout-rules.ts.)
 */
export async function releasePayout(submissionId: string): Promise<ActionState> {
  if (isDemo) return done(demo.releasePayout(submissionId));
  const admin = createAdminClient();
  const { data: sub } = await admin.from('submissions').select('campaign_id').eq('id', submissionId).single();
  if (!sub) return { error: 'Submission not found.' };
  await requireOwnCampaign(sub.campaign_id);
  const result = await payClip(admin, submissionId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/streamer/campaigns/${result.campaignId}`);
  return { success: `Paid ${usdCents(result.gross)} to the clipper via ${result.via}.` };
}

/** Streamer pins a moment from a stream for clippers to cut. */
export async function addMoment(_prev: ActionState, form: FormData): Promise<ActionState> {
  const campaignId = String(form.get('campaignId'));
  const parsed = MomentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (isDemo) return done(demo.addMoment(campaignId, parsed.data), campaignId);
  const { admin, campaign } = await requireOwnCampaign(campaignId);
  if (campaign.status === 'completed') return { error: 'This campaign has ended.' };
  const { error } = await admin.from('campaign_moments').insert({ ...parsed.data, campaign_id: campaignId });
  if (error) return { error: error.message };
  revalidatePath(`/streamer/campaigns/${campaignId}`);
  return { success: 'Moment pinned for clippers.' };
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
  revalidatePath(campaignId ? `/streamer/campaigns/${campaignId}` : '/streamer', campaignId ? 'page' : 'layout');
  return result;
}

/** Invite a clipper to one of your live campaigns, with an optional note. */
export async function inviteClipper(creatorId: string, campaignId: string, message: string): Promise<ActionState> {
  if (isDemo) return { error: 'Invites are off in the demo.' };
  const { admin, campaign } = await requireOwnCampaign(campaignId);
  if (campaign.status !== 'active' && campaign.status !== 'draft') return { error: 'This campaign has ended or is paused.' };
  const { data: joined } = await admin.from('campaign_creators').select('id').eq('campaign_id', campaignId).eq('creator_id', creatorId).maybeSingle();
  if (joined) return { error: 'They’re already in this campaign.' };
  const { error } = await admin
    .from('campaign_invites')
    .upsert({ campaign_id: campaignId, creator_id: creatorId, message: message.trim().slice(0, 500) || null, status: 'pending' }, { onConflict: 'campaign_id,creator_id' });
  if (error) return { error: 'Couldn’t send the invite. Try again.' };
  revalidatePath('/streamer/scout');
  revalidatePath(`/streamer/campaigns/${campaignId}`);
  return { success: campaign.status === 'draft' ? 'Invite saved. They’ll see it on their home page once you launch.' : 'Invite sent. They’ll see it on their home page.' };
}
