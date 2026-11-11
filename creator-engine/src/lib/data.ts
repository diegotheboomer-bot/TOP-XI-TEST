import { payoutReady, type PayoutSetup } from './payout-methods';
import { redirect } from 'next/navigation';
import { youtubeVerifyCode } from './youtube-verify';
import { clipperRecords as loadRecords } from './clipper-records';
import { approvalRate, recordFrom, tierFor, tierRank, type ClipperRecord, type Tier } from './tiers';
import { isDemo } from './env';
import { getViewer } from './session';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import { budgetStats, type BudgetStats } from './budget';
import * as demo from './demo';
import type { Campaign, Enrollment, Moment, Submission } from './types';

export type CampaignSummary = Campaign & {
  submissions: number;
  pendingReview: number;
  views: number;
  conversions: number;
  earned: number;
  budget: BudgetStats;
};
export type SubmissionRow = Submission & {
  creator_name: string;
  /** The clipper's account on the clip's platform, when connected. */
  creator_profile?: { handle: string; url: string } | null;
  creator_tier?: Tier;
  creator_avatar?: string | null;
  creator_verified?: boolean;
  /** Share of the clipper's reviewed clips that were approved, 0–1. */
  creator_approval?: number;
};

/** Public profile URL for a connected account. */
function profileUrl(platform: string, username: string | null, platformUserId: string | null): { handle: string; url: string } | null {
  const u = username?.replace(/^@/, '');
  if (platform === 'tiktok' && u) return { handle: `@${u}`, url: `https://www.tiktok.com/@${encodeURIComponent(u)}` };
  if (platform === 'instagram' && u) return { handle: `@${u}`, url: `https://www.instagram.com/${encodeURIComponent(u)}/` };
  if (platform === 'youtube' && platformUserId) return { handle: username ?? 'YouTube channel', url: `https://www.youtube.com/channel/${encodeURIComponent(platformUserId)}` };
  return null;
}
/** A moment with who claimed it (display names) and whether the viewer did. */
export type MomentRow = Moment & { claimers: string[]; mine: boolean };

/** A campaign as creators see it in Discover. */
export type MarketCampaign = Campaign & {
  brandName: string;
  budget: BudgetStats;
  creators: number;
  /** Set when an agency runs it for brandName. */
  agencyName?: string;
  brandAvatar?: string | null;
  brandVerified?: boolean;
};

/** Who clippers see: the streamer, plus the agency when one runs the campaign for them. */
function shownBrand(clientName: string | null | undefined, brands: unknown): { brandName: string; agencyName?: string; brandAvatar?: string | null; brandVerified?: boolean } {
  const b = brands as { name: string; avatar_url?: string | null; verified?: boolean } | null;
  const owner = b?.name ?? '';
  const extra = { brandAvatar: clientName ? null : (b?.avatar_url ?? null), brandVerified: !!b?.verified };
  return clientName ? { brandName: clientName, agencyName: owner, ...extra } : { brandName: owner, ...extra };
}

export interface BrandDashboard {
  brandName: string;
  /** Agencies run campaigns for streamers they manage. */
  agency?: boolean;
  campaigns: CampaignSummary[];
}

export interface CampaignDetail {
  campaign: Campaign;
  shopDomain: string | null;
  submissions: SubmissionRow[];
  /** Deposits minus refunds. */
  deposited: number;
  refunded: number;
  paidOut: number;
  /** Platform fees paid; never refunded. */
  fees: number;
  budget: BudgetStats;
  moments: MomentRow[];
}

export interface CreatorEnrollment {
  enrollment: Enrollment;
  campaign: Campaign;
  brandName: string;
  shopDomain: string | null;
  submission: Submission | null;
}

export interface CreatorDashboard {
  name: string;
  tiktok: { username: string | null; followers: number | null } | null;
  /** Verified YouTube channel, and the code to verify one. */
  youtube: { channel: string | null; subscribers: number | null } | null;
  instagram: { username: string | null; followers: number | null } | null;
  youtubeCode: string;
  /** Cash-outs in the last 7 days (the first each week is free). */
  recentCashouts: number;
  /** Ready to be paid by the chosen method. */
  payoutsEnabled: boolean;
  payout: PayoutSetup;
  enrollments: CreatorEnrollment[];
  openCampaigns: MarketCampaign[];
  /** What they said they like clipping and where they post (from the welcome questions). */
  interests?: string[];
  /** Tier and the record it's based on (missing in the demo: Silver). */
  tier?: Tier;
  record?: ClipperRecord;
}

/** Total views across the clipper's clips, one point per day (last 30 days). */
export async function getCreatorViewHistory(): Promise<{ day: string; views: number }[]> {
  if (isDemo) return [];
  const creatorId = await requireRole('creator');
  const { data: subs } = await createAdminClient().from('submissions').select('id').eq('creator_id', creatorId);
  return viewHistory((subs ?? []).map((s) => s.id as string));
}

/** Total views across the given clips, one point per day for the last 30 days. */
async function viewHistory(ids: string[]): Promise<{ day: string; views: number }[]> {
  if (!ids.length) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const { data: logs } = await createAdminClient()
    .from('social_metrics_logs')
    .select('submission_id, captured_at, view_count')
    .in('submission_id', ids)
    .gte('captured_at', since.toISOString())
    .order('captured_at');
  // Latest count per clip per day, carried forward, then summed.
  const days: string[] = [];
  for (let d = new Date(since); d <= new Date(); d = new Date(d.getTime() + 86_400_000)) days.push(d.toISOString().slice(0, 10));
  const perClip = new Map<string, Map<string, number>>();
  for (const l of logs ?? []) {
    const m = perClip.get(l.submission_id) ?? new Map<string, number>();
    m.set(String(l.captured_at).slice(0, 10), l.view_count);
    perClip.set(l.submission_id, m);
  }
  return days.map((day) => {
    let total = 0;
    for (const m of perClip.values()) {
      let last = 0;
      for (const [d, v] of m) if (d <= day) last = v;
      total += last;
    }
    return { day, views: total };
  });
}

export interface StreamerStats {
  views: number;
  spend: number;
  paid: number;
  clips: number;
  history: { day: string; views: number }[];
  campaigns: { id: string; title: string; status: string; views: number; clips: number; spend: number }[];
}

/** Streamer stats across all their campaigns, optionally for one platform. */
export async function getStreamerStats(platform?: string): Promise<StreamerStats> {
  const empty: StreamerStats = { views: 0, spend: 0, paid: 0, clips: 0, history: [], campaigns: [] };
  if (isDemo) return empty;
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data: camps } = await admin.from('campaigns').select('id, title, status').eq('brand_id', brandId).order('created_at', { ascending: false });
  if (!camps?.length) return empty;
  let q = admin
    .from('submissions')
    .select('id, campaign_id, platform, status, current_view_count, payout_earned, payout_transferred')
    .in('campaign_id', camps.map((c) => c.id));
  if (platform) q = q.eq('platform', platform);
  const { data: subs } = await q;
  const counted = (subs ?? []).filter((s) => s.status !== 'flagged');
  const sum = (list: typeof counted, k: 'current_view_count' | 'payout_earned' | 'payout_transferred') => list.reduce((n, s) => n + Number(s[k]), 0);
  return {
    views: sum(counted, 'current_view_count'),
    spend: sum(counted, 'payout_earned'),
    paid: sum(counted, 'payout_transferred'),
    clips: (subs ?? []).length,
    history: await viewHistory(counted.map((s) => s.id)),
    campaigns: camps.map((c) => {
      const list = counted.filter((s) => s.campaign_id === c.id);
      return { id: c.id, title: c.title, status: c.status, views: sum(list, 'current_view_count'), clips: list.length, spend: sum(list, 'payout_earned') };
    }),
  };
}

export interface StreamerCreator {
  id: string;
  name: string;
  handles: { platform: string; username: string | null }[];
  views: number;
  earned: number;
  paid: number;
  clips: number;
  campaigns: number;
  lastClipAt: string;
  tier?: Tier;
  avatar?: string | null;
  verified?: boolean;
}

/** Everyone who has clipped this streamer's campaigns, ranked by views. */
export async function getStreamerCreators(): Promise<StreamerCreator[]> {
  if (isDemo) return [];
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data: camps } = await admin.from('campaigns').select('id').eq('brand_id', brandId);
  if (!camps?.length) return [];
  const { data: subs } = await admin
    .from('submissions')
    .select('creator_id, campaign_id, status, current_view_count, payout_earned, payout_transferred, created_at')
    .in('campaign_id', camps.map((c) => c.id))
    .neq('status', 'flagged');
  if (!subs?.length) return [];
  const ids = [...new Set(subs.map((s) => s.creator_id as string))];
  const names = await creatorNames(ids);
  const { data: socials } = await admin.from('social_accounts').select('creator_id, platform, username').in('creator_id', ids);
  const by = new Map<string, StreamerCreator & { _camps: Set<string> }>();
  for (const s of subs) {
    const id = s.creator_id as string;
    const row =
      by.get(id) ??
      {
        id,
        name: names.get(id)?.name ?? 'Clipper',
        avatar: names.get(id)?.avatar ?? null,
        verified: !!names.get(id)?.verified,
        handles: (socials ?? []).filter((x) => x.creator_id === id).map((x) => ({ platform: x.platform as string, username: x.username as string | null })),
        views: 0,
        earned: 0,
        paid: 0,
        clips: 0,
        campaigns: 0,
        lastClipAt: s.created_at as string,
        _camps: new Set<string>(),
      };
    row.views += Number(s.current_view_count);
    row.earned += Number(s.payout_earned);
    row.paid += Number(s.payout_transferred);
    row.clips++;
    row._camps.add(s.campaign_id as string);
    if ((s.created_at as string) > row.lastClipAt) row.lastClipAt = s.created_at as string;
    by.set(id, row);
  }
  const records = await clipperRecords(ids);
  return [...by.values()]
    .map(({ _camps, ...r }) => ({ ...r, campaigns: _camps.size, tier: tierFor(records.get(r.id)!) }))
    .sort((a, b) => b.views - a.views);
}

export interface CreatorCampaignDetail {
  campaign: MarketCampaign;
  shopDomain: string | null;
  enrollment: Enrollment | null;
  submission: Submission | null;
  tiktokConnected: boolean;
  youtubeVerified: boolean;
  instagramConnected: boolean;
  youtubeCode: string;
  payoutsEnabled: boolean;
  moments: MomentRow[];
  /** All of this clipper's clips on the campaign, newest first. */
  submissions?: Submission[];
  /** Clips the streamer has approved on this campaign, from everyone. */
  approvedClips?: number;
}

/**
 * Clipper display names by id. Looked up separately: submissions reference
 * campaign_creators, not creators, so PostgREST can't embed creators directly.
 */
async function creatorNames(ids: string[]): Promise<Map<string, { name: string; avatar: string | null; verified: boolean }>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await createAdminClient().from('creators').select('id, display_name, avatar_url, verified').in('id', unique);
  return new Map((data ?? []).map((c) => [c.id as string, { name: c.display_name as string, avatar: (c.avatar_url as string | null) ?? null, verified: !!c.verified }]));
}

/** Track records (for tiers) of the given clippers. */
export const clipperRecords = (ids: string[]) => loadRecords(createAdminClient(), ids);

async function requireRole(role: 'brand' | 'creator') {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const id = role === 'brand' ? viewer.brandId : viewer.creatorId;
  if (!id) redirect('/onboarding');
  return id;
}

// PostgREST may return numeric columns as strings; coerce the money fields.
function num<T extends object>(row: T, keys: (keyof T)[]): T {
  const out = { ...row } as Record<keyof T, unknown>;
  for (const k of keys) out[k] = Number(out[k]);
  return out as T;
}
const CAMPAIGN_NUMS: (keyof Campaign)[] = ['escrow_balance', 'base_payout', 'cpm_rate', 'cpm_cap', 'cps_commission_pct'];
const SUB_NUMS: (keyof Submission)[] = ['payout_earned', 'payout_transferred'];

/**
 * Budget figures for a set of campaigns. Uses the service role because creators
 * may not read the ledger; only totals leave this function.
 */
async function loadBudgets(campaigns: Campaign[]): Promise<Map<string, BudgetStats & { creators: number }>> {
  const ids = campaigns.map((c) => c.id);
  const out = new Map<string, BudgetStats & { creators: number }>();
  if (!ids.length) return out;
  const admin = createAdminClient();
  const [{ data: ledger }, { data: subs }] = await Promise.all([
    admin.from('escrow_ledger').select('campaign_id, entry_type, amount').in('entry_type', ['deposit', 'refund']).in('campaign_id', ids),
    admin.from('submissions').select('campaign_id, status, payout_earned, payout_transferred').in('campaign_id', ids),
  ]);
  for (const c of campaigns) {
    const own = (subs ?? []).filter((s) => s.campaign_id === c.id);
    // Net of refunds, so a cancelled campaign's refund doesn't count as spent.
    const deposited = (ledger ?? []).filter((l) => l.campaign_id === c.id).reduce((a, l) => a + (l.entry_type === 'refund' ? -1 : 1) * Number(l.amount), 0);
    const owed = own
      .filter((s) => s.status === 'live_tracking')
      .reduce((a, s) => a + Number(s.payout_earned) - Number(s.payout_transferred), 0);
    out.set(c.id, { ...budgetStats({ deposited, escrow: c.escrow_balance, owed, createdAt: c.created_at }), creators: own.length });
  }
  return out;
}

/** Pinned moments with who claimed them. Service role: claim counts are public to clippers. */
async function loadMoments(campaignId: string, viewerCreatorId?: string): Promise<MomentRow[]> {
  const { data } = await createAdminClient()
    .from('campaign_moments')
    .select('id, campaign_id, title, timestamp_label, vod_url, max_claims, moment_claims(creator_id, creators(display_name))')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(({ moment_claims, ...m }) => {
    const claims = (moment_claims ?? []) as unknown as { creator_id: string; creators: { display_name: string } | null }[];
    const claimed_by = claims.map((c) => c.creator_id);
    return {
      ...(m as Omit<Moment, 'claimed_by'>),
      claimed_by,
      claimers: claims.map((c) => c.creators?.display_name ?? 'Clipper'),
      mine: !!viewerCreatorId && claimed_by.includes(viewerCreatorId),
    };
  });
}

export async function getBrandDashboard(): Promise<BrandDashboard> {
  if (isDemo) return demo.brandDashboard();
  const brandId = await requireRole('brand');
  const db = createClient();
  const [{ data: brand }, { data: campaigns }, { data: subs }] = await Promise.all([
    db.from('brands').select('name, kind').eq('id', brandId).single(),
    db.from('campaigns').select('*').eq('brand_id', brandId).order('created_at', { ascending: false }),
    db.from('submissions').select('campaign_id, status, current_view_count, current_conversions, payout_earned'),
  ]);
  const list = (campaigns ?? []).map((c) => num(c as Campaign, CAMPAIGN_NUMS));
  const budgets = await loadBudgets(list);
  return {
    brandName: brand?.name ?? '',
    agency: brand?.kind === 'agency',
    campaigns: list.map((c) => {
      const own = (subs ?? []).filter((s) => s.campaign_id === c.id);
      return {
        ...c,
        submissions: own.length,
        pendingReview: own.filter((s) => s.status === 'pending_review').length,
        views: own.reduce((a, s) => a + s.current_view_count, 0),
        conversions: own.reduce((a, s) => a + s.current_conversions, 0),
        earned: own.reduce((a, s) => a + Number(s.payout_earned), 0),
        budget: budgets.get(c.id)!,
      };
    }),
  };
}

export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  if (isDemo) return demo.campaignDetail(id);
  await requireRole('brand');
  const db = createClient();
  const [{ data: campaign }, { data: subs }, { data: ledger }] = await Promise.all([
    db.from('campaigns').select('*, conversion_pixels(shop_domain)').eq('id', id).maybeSingle(),
    db.from('submissions').select('*').eq('campaign_id', id).order('current_view_count', { ascending: false }),
    db.from('escrow_ledger').select('entry_type, amount, submission_id').eq('campaign_id', id),
  ]);
  if (!campaign) return null;
  // Platform fees on a clip payout (submission_id set) come out of the clipper's share, not the streamer's deposit.
  const sum = (type: string) => (ledger ?? []).filter((l) => l.entry_type === type && !(type === 'platform_fee' && l.submission_id)).reduce((a, l) => a + Number(l.amount), 0);
  const { conversion_pixels, ...rest } = campaign;
  const c = num(rest as Campaign, CAMPAIGN_NUMS);
  const creatorIds = [...new Set((subs ?? []).map((s) => s.creator_id as string))];
  const [names, { data: socials }, records] = await Promise.all([
    creatorNames(creatorIds),
    creatorIds.length
      ? createAdminClient().from('social_accounts').select('creator_id, platform, username, platform_user_id').in('creator_id', creatorIds)
      : Promise.resolve({ data: [] as { creator_id: string; platform: string; username: string | null; platform_user_id: string | null }[] }),
    clipperRecords(creatorIds),
  ]);
  const rows = (subs ?? []).map((s) => {
    const rec = records.get(s.creator_id as string);
    const acct = (socials ?? []).find((a) => a.creator_id === s.creator_id && a.platform === s.platform);
    return {
      ...num(s as Submission, SUB_NUMS),
      creator_name: names.get(s.creator_id as string)?.name ?? 'Clipper',
      creator_avatar: names.get(s.creator_id as string)?.avatar ?? null,
      creator_verified: !!names.get(s.creator_id as string)?.verified,
      creator_profile: acct ? profileUrl(acct.platform as string, acct.username as string | null, acct.platform_user_id as string | null) : null,
      creator_tier: rec ? tierFor(rec) : ('silver' as Tier),
      creator_approval: rec ? approvalRate(rec) : 1,
    };
  });
  // Clips waiting for review come first, highest tier first; the rest by views.
  rows.sort((a, b) => {
    const pa = a.status === 'pending_review' ? 1 : 0;
    const pb = b.status === 'pending_review' ? 1 : 0;
    if (pa !== pb) return pb - pa;
    if (pa) return tierRank(b.creator_tier!) - tierRank(a.creator_tier!);
    return b.current_view_count - a.current_view_count;
  });
  const owed = rows.filter((s) => s.status === 'live_tracking').reduce((a, s) => a + s.payout_earned - s.payout_transferred, 0);
  return {
    campaign: c,
    shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
    submissions: rows,
    deposited: sum('deposit') - sum('refund'),
    refunded: sum('refund'),
    paidOut: sum('creator_payout'),
    fees: sum('platform_fee'),
    budget: budgetStats({ deposited: sum('deposit') - sum('refund'), escrow: c.escrow_balance, owed, createdAt: c.created_at }),
    moments: await loadMoments(c.id),
  };
}

/** The clipper's payout method (readable only by them, via RLS). Stripe until they choose otherwise. */
async function loadPayoutSetup(creatorId: string, stripeReady: boolean): Promise<PayoutSetup> {
  const { data } = await createClient().from('payout_methods').select('method, handle, last_failure').eq('creator_id', creatorId).maybeSingle();
  return { method: data?.method ?? 'stripe', handle: data?.handle ?? null, stripeReady, lastFailure: data?.last_failure ?? null };
}

export async function getCreatorDashboard(): Promise<CreatorDashboard> {
  if (isDemo) return demo.creatorDashboard();
  const creatorId = await requireRole('creator');
  const db = createClient();
  const [{ data: creator }, { data: account }, { data: enrollments }, { data: open }, { data: subs }] = await Promise.all([
    db.from('creators').select('display_name, payouts_enabled, interests').eq('id', creatorId).single(),
    createAdminClient().from('social_accounts').select('platform, username, follower_count').eq('creator_id', creatorId),
    db.from('campaign_creators').select('*, campaigns(*, brands(name, avatar_url, verified), conversion_pixels(shop_domain))').eq('creator_id', creatorId),
    db.from('campaigns').select('*, brands(name, avatar_url, verified)').eq('status', 'active').order('created_at', { ascending: false }),
    db.from('submissions').select('*').eq('creator_id', creatorId),
  ]);
  const joined = new Set((enrollments ?? []).map((e) => e.campaign_id));
  const openList = (open ?? [])
    .filter((c) => !joined.has(c.id))
    .map(({ brands, ...c }) => ({ ...num(c as Campaign, CAMPAIGN_NUMS), ...shownBrand((c as { client_name?: string | null }).client_name, brands) }));
  const budgets = await loadBudgets(openList);
  const payout = await loadPayoutSetup(creatorId, creator?.payouts_enabled ?? false);
  const { count: recentCashouts } = await createAdminClient()
    .from('cashouts')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString());
  const tiktok = (account ?? []).find((a) => a.platform === 'tiktok');
  const youtube = (account ?? []).find((a) => a.platform === 'youtube');
  const instagram = (account ?? []).find((a) => a.platform === 'instagram');
  return {
    name: creator?.display_name ?? '',
    interests: ((creator as { interests?: string[] } | null)?.interests ?? []) as string[],
    tiktok: tiktok ? { username: tiktok.username, followers: tiktok.follower_count } : null,
    youtube: youtube ? { channel: youtube.username, subscribers: youtube.follower_count } : null,
    instagram: instagram ? { username: instagram.username, followers: instagram.follower_count } : null,
    youtubeCode: youtubeVerifyCode(creatorId),
    recentCashouts: recentCashouts ?? 0,
    ...(() => {
      const record = recordFrom((subs ?? []) as { status: string; current_view_count: number; fraud_score: number; created_at: string }[]);
      return { record, tier: tierFor(record) };
    })(),
    payoutsEnabled: payoutReady(payout),
    payout,
    enrollments: (enrollments ?? []).map(({ campaigns, ...e }) => {
      const { brands, conversion_pixels, ...c } = campaigns as Record<string, unknown>;
      const sub = (subs ?? []).find((s) => s.campaign_id === e.campaign_id);
      return {
        enrollment: e as Enrollment,
        campaign: num(c as unknown as Campaign, CAMPAIGN_NUMS),
        ...shownBrand((c as { client_name?: string | null }).client_name, brands),
        shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
        submission: sub ? num(sub as Submission, SUB_NUMS) : null,
      };
    }),
    openCampaigns: openList.map((c) => {
      const { creators, ...budget } = budgets.get(c.id)!;
      return { ...c, budget, creators };
    }),
  };
}

export async function getCreatorCampaign(id: string): Promise<CreatorCampaignDetail | null> {
  if (isDemo) return demo.creatorCampaign(id);
  const creatorId = await requireRole('creator');
  const db = createClient();
  const [{ data: campaign }, { data: enrollment }, { data: sub }, { data: creator }, { data: account }] = await Promise.all([
    db.from('campaigns').select('*, brands(name, avatar_url, verified), conversion_pixels(shop_domain)').eq('id', id).maybeSingle(),
    db.from('campaign_creators').select('*').eq('campaign_id', id).eq('creator_id', creatorId).maybeSingle(),
    db.from('submissions').select('*').eq('campaign_id', id).eq('creator_id', creatorId).order('created_at', { ascending: false }),
    db.from('creators').select('payouts_enabled').eq('id', creatorId).single(),
    createAdminClient().from('social_accounts').select('platform').eq('creator_id', creatorId),
  ]);
  if (!campaign) return null;
  const { brands, conversion_pixels, ...rest } = campaign;
  const c = num(rest as Campaign, CAMPAIGN_NUMS);
  const { creators, ...budget } = (await loadBudgets([c])).get(c.id)!;
  return {
    campaign: { ...c, ...shownBrand((c as { client_name?: string | null }).client_name, brands), budget, creators },
    shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
    enrollment: (enrollment as Enrollment | null) ?? null,
    submission: sub?.[0] ? num(sub[0] as Submission, SUB_NUMS) : null,
    submissions: (sub ?? []).map((x) => num(x as Submission, SUB_NUMS)),
    tiktokConnected: !!account?.some((a) => a.platform === 'tiktok'),
    youtubeVerified: !!account?.some((a) => a.platform === 'youtube'),
    instagramConnected: !!account?.some((a) => a.platform === 'instagram'),
    youtubeCode: youtubeVerifyCode(creatorId),
    payoutsEnabled: payoutReady(await loadPayoutSetup(creatorId, creator?.payouts_enabled ?? false)),
    moments: await loadMoments(c.id, creatorId),
    approvedClips:
      (await createAdminClient().from('submissions').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).in('status', ['live_tracking', 'paid'])).count ?? 0,
  };
}

export interface JoinedCampaign {
  campaign: MarketCampaign;
  /** This clipper's clips on the campaign, newest first. */
  submissions: Submission[];
}

/** Campaigns this clipper has joined, newest first, with their own clip on each. */
export async function getJoinedCampaigns(): Promise<JoinedCampaign[]> {
  if (isDemo) {
    const d = demo.creatorDashboard();
    return d.enrollments.map((e) => ({
      campaign: { ...e.campaign, brandName: e.brandName, creators: 0, budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null } },
      submissions: e.submission ? [e.submission] : [],
    }));
  }
  const creatorId = await requireRole('creator');
  const db = createClient();
  const [{ data: enrollments }, { data: subs }] = await Promise.all([
    db.from('campaign_creators').select('joined_at, campaigns(*, brands(name, avatar_url, verified))').eq('creator_id', creatorId).order('joined_at', { ascending: false }),
    db.from('submissions').select('*').eq('creator_id', creatorId).order('created_at', { ascending: false }),
  ]);
  const camps = (enrollments ?? []).map((e) => {
    const { brands, ...c } = e.campaigns as unknown as Record<string, unknown>;
    return { ...num(c as unknown as Campaign, CAMPAIGN_NUMS), ...shownBrand((c as { client_name?: string | null }).client_name, brands) };
  });
  const budgets = await loadBudgets(camps);
  return camps.map((c) => {
    const { creators, ...budget } = budgets.get(c.id)!;
    const mine = (subs ?? []).filter((s) => s.campaign_id === c.id).map((s) => num(s as Submission, SUB_NUMS));
    return { campaign: { ...c, budget, creators }, submissions: mine };
  });
}

export interface ClipperProfile {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  interests: string[];
  joinedAt: string | null;
  handles: { platform: string; handle: string; url: string }[];
  record: ClipperRecord;
  tier: Tier;
  earned: number;
  clips: number;
  /** Campaigns with this clipper's clips: all of them for the clipper, only yours for a streamer. */
  campaigns: { id: string; title: string; brandName: string; agencyName?: string; clips: number; views: number; earned: number; thumbnail_url: string | null; cover_color: string }[];
}

async function loadClipperProfile(creatorId: string, onlyBrand?: string): Promise<ClipperProfile | null> {
  const admin = createAdminClient();
  const [{ data: creator }, { data: socials }, { data: subs }] = await Promise.all([
    admin.from('creators').select('id, display_name, created_at, avatar_url, bio, verified, interests').eq('id', creatorId).maybeSingle(),
    admin.from('social_accounts').select('platform, username, platform_user_id').eq('creator_id', creatorId),
    admin.from('submissions').select('campaign_id, status, current_view_count, fraud_score, created_at, payout_earned').eq('creator_id', creatorId),
  ]);
  if (!creator) return null;
  const all = (subs ?? []) as { campaign_id: string; status: string; current_view_count: number; fraud_score: number; created_at: string; payout_earned: number }[];
  const record = recordFrom(all);
  const ids = [...new Set(all.map((s) => s.campaign_id))];
  const { data: camps } = ids.length
    ? await admin.from('campaigns').select('id, title, brand_id, client_name, thumbnail_url, cover_color, brands(name, avatar_url, verified)').in('id', ids)
    : { data: [] as Record<string, unknown>[] };
  const visible = (camps ?? []).filter((c) => !onlyBrand || c.brand_id === onlyBrand);
  return {
    id: creator.id as string,
    name: creator.display_name as string,
    avatar: (creator.avatar_url as string | null) ?? null,
    bio: (creator.bio as string | null) ?? null,
    verified: !!creator.verified,
    interests: (creator.interests as string[] | null) ?? [],
    joinedAt: (creator.created_at as string) ?? null,
    handles: (socials ?? [])
      .map((a) => profileUrl(a.platform as string, a.username as string | null, a.platform_user_id as string | null))
      .map((h, i) => (h ? { platform: (socials ?? [])[i].platform as string, ...h } : null))
      .filter((h): h is { platform: string; handle: string; url: string } => !!h),
    record,
    tier: tierFor(record),
    earned: all.filter((s) => s.status !== 'flagged').reduce((n, s) => n + Number(s.payout_earned), 0),
    clips: all.length,
    campaigns: visible.map((c) => {
      const mine = all.filter((s) => s.campaign_id === c.id && s.status !== 'flagged');
      return {
        id: c.id as string,
        title: c.title as string,
        ...shownBrand(c.client_name as string | null, c.brands),
        clips: all.filter((s) => s.campaign_id === c.id).length,
        views: mine.reduce((n, s) => n + Number(s.current_view_count), 0),
        earned: mine.reduce((n, s) => n + Number(s.payout_earned), 0),
        thumbnail_url: (c.thumbnail_url as string | null) ?? null,
        cover_color: (c.cover_color as string) ?? '#0c0f0b',
      };
    }),
  };
}

/** The signed-in clipper's tier, for the menu badge (null in the demo or when signed out). */
export async function getMyTier(): Promise<Tier | null> {
  if (isDemo) return null;
  const viewer = await getViewer();
  if (!viewer?.creatorId) return null;
  return tierFor((await clipperRecords([viewer.creatorId])).get(viewer.creatorId)!);
}

/** The signed-in clipper's own profile. */
export async function getMyClipperProfile(): Promise<ClipperProfile | null> {
  if (isDemo) return null;
  return loadClipperProfile(await requireRole('creator'));
}

/** A clipper's profile as a streamer sees it: only for clippers who posted on their campaigns. */
export async function getClipperProfileForBrand(creatorId: string): Promise<ClipperProfile | null> {
  if (isDemo) return null;
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data: camps } = await admin.from('campaigns').select('id').eq('brand_id', brandId);
  const ids = (camps ?? []).map((c) => c.id);
  if (!ids.length) return null;
  const { count } = await admin.from('submissions').select('id', { count: 'exact', head: true }).eq('creator_id', creatorId).in('campaign_id', ids);
  if (!count) return null;
  return loadClipperProfile(creatorId, brandId);
}

export interface MoneyEntry {
  id: string;
  kind: 'deposit' | 'payout' | 'refund' | 'fee';
  amount: number;
  campaignId: string;
  campaignTitle: string;
  createdAt: string;
}

export interface BrandMoney {
  added: number;
  paidToClippers: number;
  refunded: number;
  fees: number;
  held: number;
  entries: MoneyEntry[];
}

/** Everything that happened to the campaign owner's money, newest first. */
export async function getBrandMoney(): Promise<BrandMoney> {
  const empty: BrandMoney = { added: 0, paidToClippers: 0, refunded: 0, fees: 0, held: 0, entries: [] };
  if (isDemo) return empty;
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data: camps } = await admin.from('campaigns').select('id, title, escrow_balance').eq('brand_id', brandId);
  if (!camps?.length) return empty;
  const titles = new Map(camps.map((c) => [c.id as string, c.title as string]));
  const { data: ledger } = await admin
    .from('escrow_ledger')
    .select('id, campaign_id, submission_id, entry_type, amount, created_at')
    .in('campaign_id', [...titles.keys()])
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (ledger ?? []).filter((l) => !(l.entry_type === 'platform_fee' && l.submission_id)); // clipper-side fees aren't the owner's money
  const kindOf = (t: string): MoneyEntry['kind'] => (t === 'deposit' ? 'deposit' : t === 'creator_payout' ? 'payout' : t === 'refund' ? 'refund' : 'fee');
  const entries = rows.map((l) => ({
    id: l.id as string,
    kind: kindOf(l.entry_type as string),
    amount: Number(l.amount),
    campaignId: l.campaign_id as string,
    campaignTitle: titles.get(l.campaign_id as string) ?? 'Campaign',
    createdAt: l.created_at as string,
  }));
  const sum = (k: MoneyEntry['kind']) => entries.filter((e) => e.kind === k).reduce((n, e) => n + e.amount, 0);
  return {
    added: sum('deposit'),
    paidToClippers: sum('payout'),
    refunded: sum('refund'),
    fees: sum('fee'),
    held: camps.reduce((n, c) => n + Number(c.escrow_balance), 0),
    entries,
  };
}


/** True when the signed-in person hasn't answered (or skipped) the after-sign-up questions yet. */
export async function needsWelcome(): Promise<boolean> {
  if (isDemo) return false;
  const viewer = await getViewer();
  if (!viewer) return false;
  const admin = createAdminClient();
  const { data } = viewer.brandId
    ? await admin.from('brands').select('onboarded_at').eq('id', viewer.brandId).maybeSingle()
    : viewer.creatorId
      ? await admin.from('creators').select('onboarded_at').eq('id', viewer.creatorId).maybeSingle()
      : { data: null };
  return !!data && !data.onboarded_at;
}

export interface ScoutClipper {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  interests: string[];
  /** Niches they've actually clipped (from the campaigns they posted in), stated or not. */
  clipped: string[];
  tier: Tier;
  views: number;
  approved: number;
  approval: number;
  handles: { platform: string; handle: string; url: string }[];
}

/**
 * Clippers for businesses to scout, best record first. With a topic (like "Gaming"), matches
 * clippers who said they like it and clippers who've posted clips for campaigns in that niche.
 */
export async function getScoutClippers(topic?: string): Promise<ScoutClipper[]> {
  if (isDemo) return [];
  await requireRole('brand');
  const admin = createAdminClient();
  const { data: creators } = await admin.from('creators').select('id, display_name, avatar_url, bio, verified, interests').order('created_at', { ascending: false }).limit(500);
  const ids = (creators ?? []).map((c) => c.id as string);
  if (!ids.length) return [];
  const [records, { data: socials }, { data: posted }] = await Promise.all([
    clipperRecords(ids),
    admin.from('social_accounts').select('creator_id, platform, username, platform_user_id').in('creator_id', ids),
    admin.from('submissions').select('creator_id, campaign_id').in('creator_id', ids),
  ]);
  // What each clipper has clipped, by campaign niche.
  const campIds = [...new Set((posted ?? []).map((s) => s.campaign_id as string))];
  const { data: camps } = campIds.length ? await admin.from('campaigns').select('id, category').in('id', campIds) : { data: [] };
  const niche = new Map((camps ?? []).map((c) => [c.id as string, c.category as string | null]));
  const clipped = new Map<string, Set<string>>();
  for (const s of posted ?? []) {
    const n = niche.get(s.campaign_id as string);
    if (!n) continue;
    if (!clipped.has(s.creator_id as string)) clipped.set(s.creator_id as string, new Set());
    clipped.get(s.creator_id as string)!.add(n);
  }
  return (creators ?? [])
    .filter((c) => !topic || ((c.interests as string[] | null) ?? []).includes(topic) || clipped.get(c.id as string)?.has(topic))
    .map((c) => {
      const rec = records.get(c.id as string)!;
      return {
        id: c.id as string,
        name: c.display_name as string,
        avatar: (c.avatar_url as string | null) ?? null,
        bio: (c.bio as string | null) ?? null,
        verified: !!c.verified,
        interests: ((c.interests as string[] | null) ?? []).filter((i) => !i.includes(':')),
        clipped: [...(clipped.get(c.id as string) ?? [])],
        tier: tierFor(rec),
        views: rec.views,
        approved: rec.approved,
        approval: approvalRate(rec),
        handles: (socials ?? [])
          .filter((a) => a.creator_id === c.id)
          .map((a) => {
            const h = profileUrl(a.platform as string, a.username as string | null, a.platform_user_id as string | null);
            return h ? { platform: a.platform as string, ...h } : null;
          })
          .filter((h): h is { platform: string; handle: string; url: string } => !!h),
      };
    })
    .sort((a, b) => Number(b.verified) - Number(a.verified) || tierRank(b.tier) - tierRank(a.tier) || b.views - a.views);
}

export interface InvitableCampaign {
  id: string;
  title: string;
  draft: boolean;
  inviteOnly: boolean;
  /** Clippers already in the campaign (no invite needed). */
  joined: string[];
  /** Clippers with an invite already sent. */
  invited: string[];
}

/** The signed-in business's live and draft campaigns, with who's already in or invited. */
export async function getInvitableCampaigns(): Promise<InvitableCampaign[]> {
  if (isDemo) return [];
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data } = await admin.from('campaigns').select('id, title, status, invite_only').eq('brand_id', brandId).in('status', ['active', 'draft']).order('created_at', { ascending: false });
  const ids = (data ?? []).map((c) => c.id as string);
  if (!ids.length) return [];
  const [{ data: members }, { data: invites }] = await Promise.all([
    admin.from('campaign_creators').select('campaign_id, creator_id').in('campaign_id', ids),
    admin.from('campaign_invites').select('campaign_id, creator_id').in('campaign_id', ids),
  ]);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    draft: c.status === 'draft',
    inviteOnly: !!c.invite_only,
    joined: (members ?? []).filter((m) => m.campaign_id === c.id).map((m) => m.creator_id as string),
    invited: (invites ?? []).filter((m) => m.campaign_id === c.id).map((m) => m.creator_id as string),
  }));
}

export interface InviteRow {
  id: string;
  /** False while the campaign is still a draft: the clipper can't join yet. */
  live: boolean;
  message: string | null;
  campaignId: string;
  campaignTitle: string;
  brandName: string;
  brandAvatar: string | null;
}

/** Pending invites for the signed-in clipper. */
export async function getMyInvites(): Promise<InviteRow[]> {
  if (isDemo) return [];
  const viewer = await getViewer();
  if (!viewer?.creatorId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from('campaign_invites')
    .select('id, message, campaign_id, campaigns(title, status, client_name, brands(name, avatar_url))')
    .eq('creator_id', viewer.creatorId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  // Invites to a draft show as "opens at launch"; ended or paused campaigns drop off.
  const shown = (data ?? []).filter((r) => ['active', 'draft'].includes((r.campaigns as unknown as { status?: string } | null)?.status ?? ''));
  return shown.map((r) => {
    const c = r.campaigns as unknown as { title: string; status: string; client_name: string | null; brands: { name: string; avatar_url: string | null } | null } | null;
    return {
      id: r.id as string,
      live: c?.status === 'active',
      message: (r.message as string | null) ?? null,
      campaignId: r.campaign_id as string,
      campaignTitle: c?.title ?? 'Campaign',
      brandName: c?.client_name || c?.brands?.name || 'A business',
      brandAvatar: c?.client_name ? null : (c?.brands?.avatar_url ?? null),
    };
  });
}

export interface SentInvite {
  creatorId: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  status: 'pending' | 'accepted' | 'declined';
  joined: boolean;
}

/** Who the business invited to one of its campaigns, and whether they joined. */
export async function getCampaignInvites(campaignId: string): Promise<SentInvite[]> {
  if (isDemo) return [];
  const brandId = await requireRole('brand');
  const admin = createAdminClient();
  const { data: own } = await admin.from('campaigns').select('id').eq('id', campaignId).eq('brand_id', brandId).maybeSingle();
  if (!own) return [];
  const [{ data: invites }, { data: members }] = await Promise.all([
    admin.from('campaign_invites').select('creator_id, status, created_at').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
    admin.from('campaign_creators').select('creator_id').eq('campaign_id', campaignId),
  ]);
  const names = await creatorNames((invites ?? []).map((i) => i.creator_id as string));
  const inside = new Set((members ?? []).map((m) => m.creator_id as string));
  return (invites ?? []).map((i) => {
    const n = names.get(i.creator_id as string);
    return {
      creatorId: i.creator_id as string,
      name: n?.name ?? 'Clipper',
      avatar: n?.avatar ?? null,
      verified: !!n?.verified,
      status: i.status as SentInvite['status'],
      joined: inside.has(i.creator_id as string),
    };
  });
}
