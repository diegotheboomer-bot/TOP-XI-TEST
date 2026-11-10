import type { SupabaseClient } from '@supabase/supabase-js';
import { calculatePayout, type PayoutTerms } from './payout';
import { detectBotVelocity, detectLowEngagement, hashSimilarity, DUPLICATE_THRESHOLD, LOW_ENGAGEMENT_REASON } from './fraud';
import { perceptualHashFromUrl } from './phash';
import { hasDisclosure, shouldAutoApprove } from './compliance';
import { queryTikTokVideos, type VideoStats } from './platforms/tiktok';
import { getYouTubeVideos } from './platforms/youtube';
import { getInstagramAccessToken, getTikTokAccessToken } from './tokens';
import { queryInstagramReels } from './platforms/instagram';
import type { Submission } from './types';
import { payClip } from './pay-clip';
import { MIN_AUTO_PAYOUT, autoPayoutDue } from './payout-rules';

type SubmissionWithCampaign = Submission & { campaigns: PayoutTerms & { auto_approve_hours: number } };

export interface SyncReport {
  synced: number;
  flagged: number;
  autoApproved: number;
  /** Clips paid automatically after their hold. */
  paid: number;
  failed: { submissionId: string; error: string }[];
}

/**
 * Cron entry point: refresh every live or pending submission of a running campaign.
 * Videos are grouped per creator because TikTok stats need that creator's token.
 */
export async function performMetricSyncing(admin: SupabaseClient): Promise<SyncReport> {
  const { data, error } = await admin
    .from('submissions')
    .select('*, campaigns!inner(payout_model, base_payout, cpm_rate, cpm_cap, cps_commission_pct, auto_approve_hours, status)')
    .in('status', ['live_tracking', 'pending_review'])
    // Ended (cancelled) campaigns are skipped: their earnings are final.
    .in('campaigns.status', ['active', 'paused'])
    .in('platform', ['tiktok', 'youtube', 'instagram']);
  if (error) throw new Error(`Database fetch failed: ${error.message}`);

  const report: SyncReport = { synced: 0, flagged: 0, autoApproved: 0, paid: 0, failed: [] };
  const all = (data ?? []) as SubmissionWithCampaign[];
  const byCreator = new Map<string, SubmissionWithCampaign[]>();
  const igByCreator = new Map<string, SubmissionWithCampaign[]>();
  for (const s of all) {
    const map = s.platform === 'tiktok' ? byCreator : s.platform === 'instagram' ? igByCreator : null;
    map?.set(s.creator_id, [...(map.get(s.creator_id) ?? []), s]);
  }

  // YouTube: one API-key batch for every submission.
  const youtube = all.filter((x) => x.platform === 'youtube');
  if (youtube.length) {
    let stats: Map<string, VideoStats> | null = null;
    try {
      stats = new Map((await getYouTubeVideos(youtube.map((s) => s.social_platform_video_id))).map((v) => [v.id, v]));
    } catch (e) {
      youtube.forEach((s) => report.failed.push({ submissionId: s.id, error: String(e) }));
    }
    for (const sub of stats ? youtube : []) {
      try {
        const outcome = await applyStats(admin, sub, stats!.get(sub.social_platform_video_id));
        report.synced++;
        if (outcome === 'flagged') report.flagged++;
        if (outcome === 'auto_approved') report.autoApproved++;
      } catch (e) {
        report.failed.push({ submissionId: sub.id, error: String(e) });
      }
    }
  }

  const perCreator: [string, SubmissionWithCampaign[], 'tiktok' | 'instagram'][] = [
    ...[...byCreator].map(([c, s]) => [c, s, 'tiktok'] as [string, SubmissionWithCampaign[], 'tiktok']),
    ...[...igByCreator].map(([c, s]) => [c, s, 'instagram'] as [string, SubmissionWithCampaign[], 'instagram']),
  ];
  for (const [creatorId, subs, platform] of perCreator) {
    let stats: Map<string, VideoStats>;
    try {
      const ids = subs.map((s) => s.social_platform_video_id);
      const videos =
        platform === 'tiktok'
          ? await queryTikTokVideos(await getTikTokAccessToken(admin, creatorId), ids)
          : await queryInstagramReels(await getInstagramAccessToken(admin, creatorId), ids);
      stats = new Map(videos.map((v) => [v.id, v]));
    } catch (e) {
      subs.forEach((s) => report.failed.push({ submissionId: s.id, error: String(e) }));
      continue;
    }
    for (const sub of subs) {
      try {
        const outcome = await applyStats(admin, sub, stats.get(sub.social_platform_video_id));
        report.synced++;
        if (outcome === 'flagged') report.flagged++;
        if (outcome === 'auto_approved') report.autoApproved++;
      } catch (e) {
        report.failed.push({ submissionId: sub.id, error: String(e) });
      }
    }
  }
  await runAutoPayouts(admin, report);
  return report;
}

/**
 * Pays every approved clip whose hold has passed (and that is owed at least the
 * minimum, or any amount once its campaign has ended). Also covers ended
 * campaigns, which the metric sync skips, so earned money is never left unpaid.
 */
async function runAutoPayouts(admin: SupabaseClient, report: SyncReport) {
  const { data } = await admin
    .from('submissions')
    .select('id, status, approved_at, payout_earned, payout_transferred, campaigns!inner(status)')
    .eq('status', 'live_tracking')
    .not('approved_at', 'is', null);
  for (const row of (data ?? []) as unknown as { id: string; status: 'live_tracking'; approved_at: string; payout_earned: number; payout_transferred: number; campaigns: { status: string } }[]) {
    const owed = Number(row.payout_earned) - Number(row.payout_transferred);
    const campaignEnded = row.campaigns.status === 'completed';
    if (!autoPayoutDue({ status: row.status, approved_at: row.approved_at, owed, campaignEnded })) continue;
    const result = await payClip(admin, row.id, campaignEnded ? 1 : MIN_AUTO_PAYOUT);
    if (result.ok) report.paid++;
    // Clippers who haven't finished payout setup are skipped quietly; they're paid once they do.
    else if (!/payout setup/.test(result.error)) report.failed.push({ submissionId: row.id, error: result.error });
  }
}

/**
 * Writes one metrics sample, re-checks the caption's ad disclosure, runs the
 * velocity watchdog, auto-approves overdue clean submissions and recalculates
 * earnings for live ones.
 */
async function applyStats(admin: SupabaseClient, sub: SubmissionWithCampaign, v: VideoStats | undefined): Promise<'ok' | 'flagged' | 'auto_approved'> {
  const now = new Date();

  if (!v) {
    // Deleted, made private, or no longer owned by the connected account.
    const where = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' }[sub.platform];
    await admin.from('submissions').update({ status: 'flagged', flag_reason: `Video unavailable on ${where}`, last_synced_at: now.toISOString() }).eq('id', sub.id);
    return 'flagged';
  }

  const { data: prev } = await admin
    .from('social_metrics_logs')
    .select('captured_at, view_count, comment_count')
    .eq('submission_id', sub.id)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from('social_metrics_logs').insert({
    submission_id: sub.id,
    captured_at: now.toISOString(),
    view_count: v.views,
    like_count: v.likes,
    comment_count: v.comments,
    share_count: v.shares,
  });

  const metrics = {
    current_view_count: v.views,
    current_like_count: v.likes,
    current_comment_count: v.comments,
    has_disclosure: hasDisclosure(v.caption),
    ...(v.coverUrl ? { cover_url: v.coverUrl } : {}),
    last_synced_at: now.toISOString(),
  };

  if (prev) {
    const check = detectBotVelocity(
      { capturedAt: new Date(prev.captured_at), views: prev.view_count, comments: prev.comment_count },
      { capturedAt: now, views: v.views, comments: v.comments },
    );
    if (check.flagged) {
      // Pause accrual: payout_earned is left at its previous value.
      await admin
        .from('submissions')
        .update({
          ...metrics,
          status: 'flagged',
          fraud_score: 90,
          flag_reason: `Bot farm activity: ${Math.round(check.viewsPerMinute).toLocaleString('en-US')} views/min, ${(check.commentRatio * 100).toFixed(3)}% comment ratio`,
        })
        .eq('id', sub.id);
      return 'flagged';
    }
  }

  if (!sub.engagement_cleared) {
    const low = detectLowEngagement({ views: v.views, likes: v.likes, comments: v.comments });
    if (low.flagged) {
      // Hold: payout_earned stays where it was until the streamer approves the clip.
      await admin
        .from('submissions')
        .update({
          ...metrics,
          status: 'flagged',
          fraud_score: 60,
          flag_reason: `${LOW_ENGAGEMENT_REASON}: ${(low.ratio * 100).toFixed(2)}% likes and comments per view at ${v.views.toLocaleString('en-US')} views. Check it isn’t paid-promoted, then approve.`,
        })
        .eq('id', sub.id);
      return 'flagged';
    }
  }

  if (sub.status === 'pending_review') {
    const approve = shouldAutoApprove(sub, sub.campaigns.auto_approve_hours, now.getTime());
    await admin.from('submissions').update({ ...metrics, ...(approve ? { status: 'live_tracking', approved_at: now.toISOString() } : {}) }).eq('id', sub.id);
    if (!approve) return 'ok';
  }

  const revenue = sub.campaigns.payout_model === 'cps_performance' ? await attributedRevenue(admin, sub) : 0;
  const earned = Math.max(calculatePayout(sub.campaigns, v.views, revenue), Number(sub.payout_earned));

  const { error } = await admin.from('submissions').update({ ...metrics, payout_earned: earned }).eq('id', sub.id);
  if (error) throw error;
  return sub.status === 'pending_review' ? 'auto_approved' : 'ok';
}

async function attributedRevenue(admin: SupabaseClient, sub: Submission): Promise<number> {
  const { data } = await admin
    .from('conversions')
    .select('order_total, campaign_creators!inner(creator_id)')
    .eq('campaign_id', sub.campaign_id)
    .eq('campaign_creators.creator_id', sub.creator_id);
  return (data ?? []).reduce((sum, r) => sum + Number(r.order_total), 0);
}

/**
 * Duplicate Asset Matcher: compares a new submission's cover-frame pHash with
 * every other submission in the same campaign. > 95% similar ⇒ flagged.
 */
export async function checkDuplicate(
  admin: SupabaseClient,
  campaignId: string,
  submissionId: string,
  coverUrl: string | null,
): Promise<{ phash: string | null; duplicateOf: string | null }> {
  if (!coverUrl) return { phash: null, duplicateOf: null };
  const phash = await perceptualHashFromUrl(coverUrl);
  if (!phash) return { phash: null, duplicateOf: null };

  const { data } = await admin
    .from('submissions')
    .select('id, phash')
    .eq('campaign_id', campaignId)
    .neq('id', submissionId)
    .not('phash', 'is', null);

  const match = (data ?? []).find((s) => hashSimilarity(phash, s.phash as string) > DUPLICATE_THRESHOLD);
  return { phash, duplicateOf: match?.id ?? null };
}
