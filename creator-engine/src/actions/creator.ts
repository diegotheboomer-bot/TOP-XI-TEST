'use server';

import { revalidatePath } from 'next/cache';
import { selectAll } from '@/lib/fetch-all';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseVideoUrlResolving } from '@/lib/video-url';
import { getInstagramAccessToken, getTikTokAccessToken } from '@/lib/tokens';
import { queryInstagramReels } from '@/lib/platforms/instagram';
import { queryTikTokVideos } from '@/lib/platforms/tiktok';
import { checkDuplicate } from '@/lib/sync';
import { hasDisclosure } from '@/lib/compliance';
import { getYouTubeChannel, getYouTubeVideos, parseChannelInput } from '@/lib/platforms/youtube';
import { youtubeVerifyCode } from '@/lib/youtube-verify';
import { generateDiscountCode, refParam } from '@/lib/attribution';
import { stripe, CLIPPER_ACCOUNT_DEFAULTS } from '@/lib/stripe';
import { paypalConfigured } from '@/lib/paypal';
import { PayoutHandleSchema, payoutDestination } from '@/lib/payout-methods';
import * as demo from '@/lib/demo';
import { payClip } from '@/lib/pay-clip';
import { cashoutReady } from '@/lib/payout-rules';
import { TIER_LABEL, TIER_PERKS, atLeast, tierFor, type Tier } from '@/lib/tiers';
import { clipperRecords } from '@/lib/data';
import { clipperTier } from '@/lib/clipper-records';
import { usd, usdCents } from '@/lib/format';
import type { ActionState, SubmitCheck, SubmitState } from './result';

async function requireCreator() {
  const viewer = await getViewer();
  if (!viewer?.creatorId) throw new Error('Sign in as a creator first.');
  return viewer.creatorId;
}

export async function joinCampaign(campaignId: string): Promise<ActionState> {
  if (isDemo) return refreshed(demo.joinCampaign(campaignId));
  const creatorId = await requireCreator();
  const admin = createAdminClient();

  const { data: campaign } = await admin.from('campaigns').select('id, status, code_prefix, min_tier, invite_only').eq('id', campaignId).maybeSingle();
  if (!campaign || campaign.status !== 'active') return { error: 'This campaign is not accepting creators.' };
  if (campaign.invite_only) {
    const { data: invite } = await admin.from('campaign_invites').select('id').eq('campaign_id', campaignId).eq('creator_id', creatorId).maybeSingle();
    if (!invite) return { error: 'This campaign is invite only.' };
  }
  const minTier = (campaign.min_tier ?? 'silver') as Tier;
  if (minTier !== 'silver') {
    const tier = tierFor((await clipperRecords([creatorId])).get(creatorId)!);
    if (!atLeast(tier, minTier)) return { error: `This campaign is for ${TIER_LABEL[minTier]} clippers and up. You’re ${TIER_LABEL[tier]}.` };
  }

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
  return { success: 'Joined. Post your first clip.' };
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
export async function submitVideo(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (form.get('noPaidPromo') !== 'on') return { error: 'Confirm the clip isn’t paid-promoted.' };
  const parsedForm = SubmitSchema.safeParse({ campaignId: form.get('campaignId'), videoUrl: form.get('videoUrl') });
  if (!parsedForm.success) return { error: parsedForm.error.issues[0].message };
  const { campaignId, videoUrl } = parsedForm.data;
  if (isDemo) return refreshed(demo.submitVideo(campaignId, videoUrl));

  const creatorId = await requireCreator();
  const admin = createAdminClient();

  // Each step adds a line to the checklist the clipper sees; the first failure stops.
  const checks: SubmitCheck[] = [];
  const pass = (label: string, detail?: string) => checks.push({ label, status: 'pass', detail });
  const fail = (label: string, detail: string): SubmitState => {
    checks.push({ label, status: 'fail', detail });
    return { error: detail, checks };
  };

  const { data: enrollment } = await admin
    .from('campaign_creators')
    .select('id, discount_code, joined_at, campaigns(status, platforms, max_clips_per_clipper)')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  const campaign = enrollment?.campaigns as unknown as { status: string; platforms: string[]; max_clips_per_clipper: number | null } | null;
  if (!enrollment) return fail('You’re in this campaign', 'Join the campaign before submitting.');
  if (campaign?.status !== 'active') return fail('Campaign is open', 'This campaign is not accepting clips right now.');
  if (campaign.max_clips_per_clipper) {
    const { count } = await admin.from('submissions').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('creator_id', creatorId);
    if ((count ?? 0) >= campaign.max_clips_per_clipper) {
      const n = campaign.max_clips_per_clipper;
      return fail('Room for another clip', `This campaign allows ${n} ${n === 1 ? 'clip' : 'clips'} per clipper, and you’ve posted ${n === 1 ? 'yours' : 'them all'}.`);
    }
  }

  const parsed = await parseVideoUrlResolving(videoUrl);
  if (!parsed.ok) {
    return fail(
      'Link recognised',
      parsed.reason === 'unsupported_host' ? 'Only TikTok, Instagram Reels and YouTube Shorts links work.' : 'We couldn’t find a video in that link. Open the video itself, tap Share → Copy link, and paste that.',
    );
  }
  const { platform, videoId, canonicalUrl } = parsed.video;
  const where = { tiktok: 'TikTok', youtube: 'YouTube Shorts', instagram: 'Instagram Reels' }[platform];
  pass('Link recognised', where);
  if (!campaign.platforms.includes(platform)) return fail('Campaign takes this platform', `This campaign doesn’t take ${where} clips.`);
  pass('Campaign takes this platform');

  let stats;
  if (platform === 'tiktok') {
    // TikTok: the creator's own token can only see their own videos, which proves ownership.
    try {
      const token = await getTikTokAccessToken(admin, creatorId);
      [stats] = await queryTikTokVideos(token, [videoId]);
    } catch (e) {
      return fail('Video found', e instanceof Error && e.message.includes('not connected') ? 'Connect your TikTok account first.' : 'TikTok couldn’t be reached. Try again shortly.');
    }
    if (!stats) return fail('Video found', 'That video isn’t on your connected TikTok account.');
    pass('Video found');
    pass('It’s your video', 'On your connected TikTok');
  } else if (platform === 'instagram') {
    // Instagram: read through the clipper's own connected account, which proves the Reel is theirs.
    try {
      const token = await getInstagramAccessToken(admin, creatorId);
      [stats] = await queryInstagramReels(token, [videoId]);
    } catch (e) {
      return fail('Video found', e instanceof Error && /not connected|expired/.test(e.message) ? 'Connect your Instagram account first.' : 'Instagram couldn’t be reached. Try again shortly.');
    }
    if (!stats) return fail('Video found', 'That Reel isn’t on your connected Instagram account.');
    pass('Video found');
    pass('It’s your video', 'On your connected Instagram');
  } else {
    // YouTube: public stats; ownership comes from the clipper's verified channel.
    const { data: channel } = await admin.from('social_accounts').select('platform_user_id, username').eq('creator_id', creatorId).eq('platform', 'youtube').maybeSingle();
    if (!channel) return fail('It’s your video', 'Verify your YouTube channel first: Accounts on your dashboard.');
    try {
      [stats] = await getYouTubeVideos([videoId]);
    } catch {
      return fail('Video found', 'YouTube couldn’t be reached. Try again shortly.');
    }
    if (!stats) return fail('Video found', 'That YouTube video is private or doesn’t exist.');
    pass('Video found');
    if (stats.channelId !== channel.platform_user_id) {
      return fail('It’s your video', `This Short isn’t on your verified channel${channel.username ? ` (${channel.username})` : ''}.`);
    }
    pass('It’s your video', `On your verified channel${channel.username ? `, ${channel.username}` : ''}`);
  }

  // Only clips made for this campaign: posted after joining it.
  if (stats.publishedAt && enrollment.joined_at && new Date(stats.publishedAt) < new Date(enrollment.joined_at)) {
    return fail('Posted after you joined', 'This video was posted before you joined the campaign. Post a new clip for it.');
  }
  pass('Posted after you joined', stats.publishedAt ? `Posted ${timeAgo(stats.publishedAt)}` : undefined);

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
      cover_url: stats.coverUrl,
      last_synced_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return fail('Not submitted before', 'This video was already submitted to this campaign.');
    }
    return fail('Saved', 'Couldn’t save the clip. Try again.');
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
  if (dup.duplicateOf) {
    checks.push({ label: 'Original clip', status: 'fail', detail: 'It matches another clipper’s video in this campaign, so it’s held for the streamer.' });
    return { error: 'Submitted, but held: it matches another clip in this campaign.', checks };
  }
  pass('Original clip', 'No copies found in this campaign');
  return { success: 'Submitted. The streamer will review it shortly.', checks };
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)} days ago`;
}

/**
 * Verify a YouTube channel: the clipper's code must be in its description.
 * Once verified, any Short from that channel counts as theirs; the code can be removed.
 */
export async function verifyYouTubeChannel(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { success: 'Verified.' };
  const creatorId = await requireCreator();
  const ref = parseChannelInput(String(form.get('channel') ?? ''));
  if (!ref) return { error: 'Paste your channel link, like youtube.com/@yourname.' };
  let channel;
  try {
    channel = await getYouTubeChannel(ref);
  } catch {
    return { error: 'YouTube couldn’t be reached. Try again shortly.' };
  }
  if (!channel) return { error: 'No YouTube channel found at that link.' };
  const code = youtubeVerifyCode(creatorId);
  if (!channel.description.toUpperCase().includes(code)) {
    return { error: `${code} isn’t in ${channel.title}’s description yet. Saved changes can take a minute to show.` };
  }
  const { error } = await createAdminClient()
    .from('social_accounts')
    .upsert({ creator_id: creatorId, platform: 'youtube', platform_user_id: channel.id, username: channel.title, follower_count: channel.subscribers, updated_at: new Date().toISOString() }, { onConflict: 'creator_id,platform' });
  if (error?.code === '23505') return { error: 'That channel is already verified on another account.' };
  if (error) return { error: 'Couldn’t save. Try again.' };
  revalidatePath('/clipper');
  return { success: `${channel.title} is verified. You can remove the code from your description now.` };
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
    ...CLIPPER_ACCOUNT_DEFAULTS,
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
  // Finishing Stripe's form means the clipper chose bank or debit card.
  if (account.payouts_enabled) {
    await admin.from('payout_methods').upsert({ creator_id: creatorId, method: 'stripe', handle: null, last_failure: null, updated_at: new Date().toISOString() });
  }
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

/**
 * Clipper chooses how to get paid. PayPal and Venmo save the email or US
 * mobile number; choosing bank/debit card switches back to Stripe (onboarding
 * still has to be finished there).
 */
export async function savePayoutMethod(method: string, handle: string): Promise<ActionState> {
  let row: { method: 'stripe' | 'paypal' | 'venmo'; handle: string | null };
  if (method === 'stripe') row = { method: 'stripe', handle: null };
  else {
    const parsed = PayoutHandleSchema.safeParse({ method, handle });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    row = parsed.data;
  }
  if (isDemo) return refreshed(demo.setPayoutMethod(row.method, row.handle));
  if (row.method !== 'stripe' && !paypalConfigured()) return { error: 'PayPal and Venmo payouts aren’t switched on yet. Use a bank or debit card for now.' };
  const creatorId = await requireCreator();
  const { error } = await createAdminClient()
    .from('payout_methods')
    .upsert({ creator_id: creatorId, ...row, last_failure: null, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  return refreshed({ success: row.method === 'stripe' ? 'Bank or debit card selected.' : `Payouts will go to ${payoutDestination(row)}.` });
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

/**
 * Cash out: send everything that's ready (approved and past the tier's hold) to the
 * clipper's payout method now. The fee is a flat 2% and the tier sets
 * how many cash-outs a week are allowed.
 */
export async function cashOut(amount?: number): Promise<ActionState> {
  if (isDemo) return { success: 'Cashed out (demo).' };
  const creatorId = await requireCreator();
  const admin = createAdminClient();
  const [{ data: subs }, { data: recent }, tier] = await Promise.all([
    selectAll(() => admin.from('submissions').select('id, status, approved_at, payout_earned, payout_transferred, campaigns(payout_model, status)').eq('creator_id', creatorId).order('id')),
    admin.from('cashouts').select('created_at').eq('creator_id', creatorId).gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()).order('created_at'),
    clipperTier(admin, creatorId),
  ]);
  const perks = TIER_PERKS[tier];
  if ((recent?.length ?? 0) >= perks.cashoutsPerWeek) {
    const nextAt = new Date(new Date(recent![0].created_at as string).getTime() + 7 * 86_400_000);
    return { error: `${TIER_LABEL[tier]} clippers can cash out ${perks.cashoutsPerWeek === 1 ? 'once' : `${perks.cashoutsPerWeek} times`} a week. Your next cash-out opens ${nextAt.toLocaleDateString('en-US', { weekday: 'long' })}.` };
  }
  const ready = (subs ?? [])
    .map((s) => ({ ...s, owed: Math.round((Number(s.payout_earned) - Number(s.payout_transferred)) * 100) / 100 }))
    .filter((s) => {
      const c = s.campaigns as unknown as { payout_model: string; status: string } | null;
      const openPool = c?.payout_model === 'pool' && c.status !== 'completed';
      return s.owed > 0 && !openPool && cashoutReady(s as { status: 'live_tracking'; approved_at: string | null }, Date.now(), perks.holdHours);
    })
    .sort((a, b) => b.owed - a.owed);
  if (!ready.length) return { error: 'Nothing is ready to cash out yet.' };
  const balance = Math.round(ready.reduce((n, s) => n + s.owed, 0) * 100) / 100;
  // The clipper can take out part of their balance; the rest stays for later.
  let remaining = amount == null ? balance : Math.min(balance, Math.floor(Number(amount) * 100) / 100);
  if (!(remaining >= 0.01)) return { error: 'Enter an amount to cash out.' };

  let sent = 0;
  let gross = 0;
  const errors: string[] = [];
  for (const s of ready) {
    if (remaining < 0.01) break;
    const take = Math.min(s.owed, remaining);
    const r = await payClip(admin, s.id, 0.01, take);
    if (r.ok) {
      sent += r.gross;
      gross += take;
      remaining = Math.round((remaining - take) * 100) / 100;
    } else errors.push(r.error);
  }
  const fee = Math.round((gross - sent) * 100) / 100;
  if (sent > 0) await admin.from('cashouts').insert({ creator_id: creatorId, amount: Math.round(sent * 100) / 100, fee });
  revalidatePath('/clipper/earnings');
  revalidatePath('/clipper/payouts');
  if (!sent) return { error: errors[0] ?? 'Couldn’t cash out. Try again.' };
  return { success: fee > 0 ? `${usdCents(sent)} is on its way (${perks.feePct}% ${TIER_LABEL[tier]} fee: ${usdCents(fee)}).` : `${usdCents(sent)} is on its way.` };
}

export async function connectInstagram(): Promise<void> {
  if (isDemo) redirect('/clipper?instagram=connected');
  redirect('/api/oauth/instagram/start');
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

/** Accept (joins the campaign) or decline an invite. */
export async function respondInvite(inviteId: string, accept: boolean): Promise<ActionState> {
  if (isDemo) return { error: 'Invites are off in the demo.' };
  const creatorId = await requireCreator();
  const admin = createAdminClient();
  const { data: invite } = await admin.from('campaign_invites').select('id, campaign_id, creator_id, status').eq('id', inviteId).maybeSingle();
  if (!invite || invite.creator_id !== creatorId) return { error: 'Invite not found.' };
  if (accept) {
    const joined = await joinCampaign(invite.campaign_id as string);
    if (joined?.error && !joined.error.includes('already joined')) return joined;
  }
  await admin.from('campaign_invites').update({ status: accept ? 'accepted' : 'declined' }).eq('id', inviteId);
  revalidatePath('/clipper');
  return { success: accept ? 'Joined. Open the campaign to post your first clip.' : 'Invite declined.' };
}
