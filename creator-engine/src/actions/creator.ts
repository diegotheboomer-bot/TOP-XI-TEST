'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseVideoUrlResolving } from '@/lib/video-url';
import { getTikTokAccessToken } from '@/lib/tokens';
import { queryTikTokVideos } from '@/lib/platforms/tiktok';
import { checkDuplicate } from '@/lib/sync';
import { hasClipCode, hasDisclosure } from '@/lib/compliance';
import { getYouTubeVideos } from '@/lib/platforms/youtube';
import { generateDiscountCode, refParam } from '@/lib/attribution';
import { stripe } from '@/lib/stripe';
import * as demo from '@/lib/demo';
import type { ActionState } from './result';

async function requireCreator() {
  const viewer = await getViewer();
  if (!viewer?.creatorId) throw new Error('Sign in as a creator first.');
  return viewer.creatorId;
}

export async function joinCampaign(campaignId: string): Promise<ActionState> {
  if (isDemo) return refreshed(demo.joinCampaign(campaignId));
  const creatorId = await requireCreator();
  const admin = createAdminClient();

  const { data: campaign } = await admin.from('campaigns').select('id, status, code_prefix').eq('id', campaignId).maybeSingle();
  if (!campaign || campaign.status !== 'active') return { error: 'This campaign is not accepting creators.' };

  // Retry on the (unlikely) discount-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await admin.from('campaign_creators').insert({
      campaign_id: campaignId,
      creator_id: creatorId,
      ref_param: refParam(creatorId, campaignId),
      discount_code: generateDiscountCode(campaign.code_prefix),
    });
    if (!error) break;
    if (error.code !== '23505') return { error: error.message };
    if (!error.message.includes('discount_code')) return { error: 'You already joined this campaign.' };
  }
  revalidatePath('/clipper');
  return { success: 'Joined. Your clip code is ready.' };
}

const SubmitSchema = z.object({
  campaignId: z.string().min(1).max(64),
  videoUrl: z.string().trim().url('Paste the full link to your live video.').max(2048),
});

/**
 * Matching engine: validates a live video link, proves ownership through the
 * creator's own TikTok token, stores a baseline metric sample and runs the
 * duplicate-asset check. Recurring sync starts once the streamer approves.
 */
export async function submitVideo(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsedForm = SubmitSchema.safeParse({ campaignId: form.get('campaignId'), videoUrl: form.get('videoUrl') });
  if (!parsedForm.success) return { error: parsedForm.error.issues[0].message };
  const { campaignId, videoUrl } = parsedForm.data;
  if (isDemo) return refreshed(demo.submitVideo(campaignId, videoUrl));

  const creatorId = await requireCreator();
  const admin = createAdminClient();

  const { data: enrollment } = await admin
    .from('campaign_creators')
    .select('id, discount_code, campaigns(status, platforms)')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  const campaign = enrollment?.campaigns as unknown as { status: string; platforms: string[] } | null;
  if (!enrollment) return { error: 'Join the campaign before submitting.' };
  if (campaign?.status !== 'active') return { error: 'This campaign is not accepting submissions.' };

  const parsed = await parseVideoUrlResolving(videoUrl);
  if (!parsed.ok) {
    return {
      error:
        parsed.reason === 'unsupported_host'
          ? 'Only TikTok, Instagram Reels and YouTube Shorts links are recognised.'
          : 'That link does not point to a single video.',
    };
  }
  const { platform, videoId, canonicalUrl } = parsed.video;
  if (!campaign?.platforms.includes(platform)) return { error: 'This campaign doesn’t accept that platform.' };
  if (platform === 'instagram') return { error: 'Instagram Reels tracking isn’t connected yet. Submit a TikTok or YouTube Short.' };

  let stats;
  if (platform === 'tiktok') {
    // TikTok: the creator's own token can only see their own videos, which proves ownership.
    try {
      const token = await getTikTokAccessToken(admin, creatorId);
      [stats] = await queryTikTokVideos(token, [videoId]);
    } catch (e) {
      return { error: e instanceof Error && e.message.includes('not connected') ? 'Connect your TikTok account first.' : 'TikTok could not be reached. Try again shortly.' };
    }
    if (!stats) return { error: 'That video is not on your connected TikTok account.' };
  } else {
    // YouTube: public stats; ownership is proven by the clip code in the title or description.
    try {
      [stats] = await getYouTubeVideos([videoId]);
    } catch {
      return { error: 'YouTube could not be reached. Try again shortly.' };
    }
    if (!stats) return { error: 'That YouTube video is private or doesn’t exist.' };
    if (!hasClipCode(stats.caption, enrollment.discount_code)) {
      return { error: `Add your clip code ${enrollment.discount_code} to the video’s title or description so we know it’s yours.` };
    }
  }

  const { data: submission, error } = await admin
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      creator_id: creatorId,
      platform,
      video_url: canonicalUrl,
      social_platform_video_id: videoId,
      current_view_count: stats.views,
      current_like_count: stats.likes,
      current_comment_count: stats.comments,
      has_disclosure: hasDisclosure(stats.caption),
      last_synced_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { error: error.message.includes('creator_id') ? 'You already have a submission in this campaign.' : 'This video was already submitted to this campaign.' };
    }
    return { error: 'Could not save the submission.' };
  }

  await admin.from('social_metrics_logs').insert({
    submission_id: submission.id,
    view_count: stats.views,
    like_count: stats.likes,
    comment_count: stats.comments,
    share_count: stats.shares,
  });

  const dup = await checkDuplicate(admin, campaignId, submission.id, stats.coverUrl).catch(() => ({ phash: null, duplicateOf: null }));
  if (dup.phash) {
    await admin
      .from('submissions')
      .update(
        dup.duplicateOf
          ? { phash: dup.phash, status: 'flagged', fraud_score: 100, flag_reason: 'Duplicate content: >95% match with another submission' }
          : { phash: dup.phash },
      )
      .eq('id', submission.id);
  }

  revalidatePath('/clipper');
  if (dup.duplicateOf) return { error: 'Submitted, but flagged: it matches another creator’s video in this campaign.' };
  if (!hasDisclosure(stats.caption)) return { success: 'Submitted. Add #ad to your caption so it can be approved.' };
  return { success: 'Submitted. The streamer will review it shortly.' };
}

/**
 * The clipper's Stripe connected account, created on first use. Stripe hosts
 * the Express dashboard and collects identity details; the platform pays
 * Stripe's fees and covers negative balances (it only ever sends transfers).
 */
async function payoutAccount(creatorId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: creator } = await admin.from('creators').select('stripe_account_id').eq('id', creatorId).single();
  if (creator?.stripe_account_id) return creator.stripe_account_id as string;
  const account = await stripe().accounts.create({
    controller: {
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      stripe_dashboard: { type: 'express' },
    },
    capabilities: { transfers: { requested: true } },
    metadata: { creator_id: creatorId },
  });
  await admin.from('creators').update({ stripe_account_id: account.id }).eq('id', creatorId);
  return account.id;
}

export type PayoutSessionResult = { clientSecret: string } | { error: string };

/** Client secret for the embedded onboarding form on /clipper/payouts. */
export async function createPayoutSession(): Promise<PayoutSessionResult> {
  if (isDemo) return { error: 'Stripe is off in demo mode.' };
  try {
    const account = await payoutAccount(await requireCreator());
    const session = await stripe().accountSessions.create({
      account,
      components: { account_onboarding: { enabled: true, features: { external_account_collection: true } } },
    });
    return { clientSecret: session.client_secret };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not start payout setup.' };
  }
}

/** After the onboarding form closes: read the account now instead of waiting for the account.updated webhook. */
export async function refreshPayoutStatus(): Promise<ActionState> {
  if (isDemo) return undefined;
  const creatorId = await requireCreator();
  const admin = createAdminClient();
  const { data: creator } = await admin.from('creators').select('stripe_account_id').eq('id', creatorId).single();
  if (!creator?.stripe_account_id) return undefined;
  const account = await stripe().accounts.retrieve(creator.stripe_account_id as string);
  await admin.from('creators').update({ payouts_enabled: account.payouts_enabled ?? false }).eq('id', creatorId);
  revalidatePath('/clipper', 'layout');
  return account.payouts_enabled ? { success: 'Payouts are on.' } : undefined;
}

/** Stripe Express dashboard: payout history, bank details, tax forms. */
export async function openPayoutDashboard(): Promise<void> {
  if (isDemo) redirect('/clipper/payouts');
  const account = await payoutAccount(await requireCreator());
  const link = await stripe().accounts.createLoginLink(account);
  redirect(link.url);
}

/** Demo: the mock onboarding form finished. */
export async function completeDemoPayouts(): Promise<ActionState> {
  if (!isDemo) return { error: 'Use the Stripe form.' };
  demo.enablePayouts();
  return refreshed({ success: 'Payouts are on (mock).' });
}

/** Clipper claims a pinned moment before cutting it (limited claims per moment). */
export async function claimMoment(momentId: string): Promise<ActionState> {
  if (isDemo) return refreshed(demo.claimMoment(momentId));
  const creatorId = await requireCreator();
  const admin = createAdminClient();
  const { data: moment } = await admin.from('campaign_moments').select('campaign_id').eq('id', momentId).maybeSingle();
  if (!moment) return { error: 'Moment not found.' };
  const { data: campaign } = await admin.from('campaigns').select('status').eq('id', moment.campaign_id).single();
  if (campaign?.status !== 'active') return { error: 'This campaign isn’t taking new clips.' };
  const { data: enrolled } = await admin.from('campaign_creators').select('id').eq('campaign_id', moment.campaign_id).eq('creator_id', creatorId).maybeSingle();
  if (!enrolled) return { error: 'Join the campaign to claim moments.' };
  const { data: result } = await admin.rpc('claim_moment', { p_moment: momentId, p_creator: creatorId });
  const messages: Record<string, ActionState> = {
    ok: { success: 'Claimed. It’s yours to clip.' },
    already: { error: 'You already claimed this moment.' },
    full: { error: 'Every slot for this moment is taken.' },
    not_found: { error: 'Moment not found.' },
  };
  return refreshed(messages[String(result)] ?? { error: 'Could not claim the moment.' });
}

/** TikTok Login Kit (mocked in demo mode). */
export async function connectTikTok(): Promise<void> {
  if (isDemo) {
    demo.connectTikTok();
    redirect('/clipper?tiktok=connected');
  }
  redirect('/api/oauth/tiktok/start');
}

/** Demo only: switch which creator you are viewing as. */
export async function viewAsCreator(form: FormData): Promise<void> {
  if (isDemo) demo.setCurrentCreator(String(form.get('creatorId')));
  const back = String(form.get('back') ?? '');
  redirect(back === '/clipper/payouts' ? back : '/clipper');
}

function refreshed(result: ActionState): ActionState {
  revalidatePath('/clipper', 'layout');
  return result;
}
