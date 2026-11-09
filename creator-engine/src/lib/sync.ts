import type { SupabaseClient } from '@supabase/supabase-js';
import { calculatePayout, type PayoutTerms } from './payout';
import { detectBotVelocity, hashSimilarity, DUPLICATE_THRESHOLD } from './fraud';
import { perceptualHashFromUrl } from './phash';
import { hasDisclosure, shouldAutoApprove } from './compliance';
import { queryTikTokVideos, type VideoStats } from './platforms/tiktok';
import { getYouTubeVideos } from './platforms/youtube';
import { getTikTokAccessToken } from './tokens';
import type { Submission } from './types';

type SubmissionWithCampaign = Submission & { campaigns: PayoutTerms & { auto_approve_hours: number } };

export interface SyncReport {
  synced: number;
  flagged: number;
  autoApproved: number;
  failed: { submissionId: string; error: string }[];
}

/**
 * Cron entry point: refresh every live_tracking submission.
 * Videos are grouped per creator because TikTok stats need that creator's token.
 */
export async function performMetricSyncing(admin: SupabaseClient): Promise<SyncReport> {
  const { data, error } = await admin
    .from('submissions')
    .select('*, campaigns(payout_model, base_payout, cpm_rate, cpm_cap, cps_commission_pct, auto_approve_hours)')
    .in('status', ['live_tracking', 'pending_review'])
    .in('platform', ['tiktok', 'youtube']);
  if (error) throw new Error(`Database fetch failed: ${error.message}`);

  const report: SyncReport = { synced: 0, flagged: 0, autoApproved: 0, failed: [] };
  const all = (data ?? []) as SubmissionWithCampaign[];
  const byCreator = new Map<string, SubmissionWithCampaign[]>();
  for (const s of all.filter((x) => x.platform === 'tiktok')) {
    byCreator.set(s.creator_id, [...(byCreator.get(s.creator_id) ?? []), s]);
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

  for (const [creatorId, subs] of byCreator) {
    let stats: Map<string, VideoStats>;
    try {
      const token = await getTikTokAccessToken(admin, creatorId);
      const videos = await queryTikTokVideos(token, subs.map((s) => s.social_platform_video_id));
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
  return report;
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
    const where = sub.platform === 'youtube' ? 'YouTube' : 'TikTok';
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

  if (sub.status === 'pending_review') {
    const approve = shouldAutoApprove({ ...sub, has_disclosure: metrics.has_disclosure }, sub.campaigns.auto_approve_hours, now.getTime());
    await admin.from('submissions').update({ ...metrics, ...(approve ? { status: 'live_tracking' } : {}) }).eq('id', sub.id);
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
