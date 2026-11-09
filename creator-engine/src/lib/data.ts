import { redirect } from 'next/navigation';
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
export type SubmissionRow = Submission & { creator_name: string };
/** A moment with who claimed it (display names) and whether the viewer did. */
export type MomentRow = Moment & { claimers: string[]; mine: boolean };

/** A campaign as creators see it in Discover. */
export type MarketCampaign = Campaign & { brandName: string; budget: BudgetStats; creators: number };

export interface BrandDashboard {
  brandName: string;
  campaigns: CampaignSummary[];
}

export interface CampaignDetail {
  campaign: Campaign;
  shopDomain: string | null;
  submissions: SubmissionRow[];
  deposited: number;
  paidOut: number;
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
  payoutsEnabled: boolean;
  enrollments: CreatorEnrollment[];
  openCampaigns: MarketCampaign[];
}

export interface CreatorCampaignDetail {
  campaign: MarketCampaign;
  shopDomain: string | null;
  enrollment: Enrollment | null;
  submission: Submission | null;
  tiktokConnected: boolean;
  payoutsEnabled: boolean;
  moments: MomentRow[];
}

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
    admin.from('escrow_ledger').select('campaign_id, amount').eq('entry_type', 'deposit').in('campaign_id', ids),
    admin.from('submissions').select('campaign_id, status, payout_earned, payout_transferred').in('campaign_id', ids),
  ]);
  for (const c of campaigns) {
    const own = (subs ?? []).filter((s) => s.campaign_id === c.id);
    const deposited = (ledger ?? []).filter((l) => l.campaign_id === c.id).reduce((a, l) => a + Number(l.amount), 0);
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
    db.from('brands').select('name').eq('id', brandId).single(),
    db.from('campaigns').select('*').eq('brand_id', brandId).order('created_at', { ascending: false }),
    db.from('submissions').select('campaign_id, status, current_view_count, current_conversions, payout_earned'),
  ]);
  const list = (campaigns ?? []).map((c) => num(c as Campaign, CAMPAIGN_NUMS));
  const budgets = await loadBudgets(list);
  return {
    brandName: brand?.name ?? '',
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
    db.from('submissions').select('*, creators(display_name)').eq('campaign_id', id).order('current_view_count', { ascending: false }),
    db.from('escrow_ledger').select('entry_type, amount').eq('campaign_id', id),
  ]);
  if (!campaign) return null;
  const sum = (type: string) => (ledger ?? []).filter((l) => l.entry_type === type).reduce((a, l) => a + Number(l.amount), 0);
  const { conversion_pixels, ...rest } = campaign;
  const c = num(rest as Campaign, CAMPAIGN_NUMS);
  const rows = (subs ?? []).map(({ creators, ...s }) => ({
    ...num(s as Submission, SUB_NUMS),
    creator_name: (creators as { display_name: string } | null)?.display_name ?? 'Creator',
  }));
  const owed = rows.filter((s) => s.status === 'live_tracking').reduce((a, s) => a + s.payout_earned - s.payout_transferred, 0);
  return {
    campaign: c,
    shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
    submissions: rows,
    deposited: sum('deposit'),
    paidOut: sum('creator_payout'),
    fees: sum('platform_fee'),
    budget: budgetStats({ deposited: sum('deposit'), escrow: c.escrow_balance, owed, createdAt: c.created_at }),
    moments: await loadMoments(c.id),
  };
}

export async function getCreatorDashboard(): Promise<CreatorDashboard> {
  if (isDemo) return demo.creatorDashboard();
  const creatorId = await requireRole('creator');
  const db = createClient();
  const [{ data: creator }, { data: account }, { data: enrollments }, { data: open }, { data: subs }] = await Promise.all([
    db.from('creators').select('display_name, payouts_enabled').eq('id', creatorId).single(),
    createAdminClient().from('social_accounts').select('username, follower_count').eq('creator_id', creatorId).eq('platform', 'tiktok').maybeSingle(),
    db.from('campaign_creators').select('*, campaigns(*, brands(name), conversion_pixels(shop_domain))').eq('creator_id', creatorId),
    db.from('campaigns').select('*, brands(name)').eq('status', 'active').order('created_at', { ascending: false }),
    db.from('submissions').select('*').eq('creator_id', creatorId),
  ]);
  const joined = new Set((enrollments ?? []).map((e) => e.campaign_id));
  const openList = (open ?? [])
    .filter((c) => !joined.has(c.id))
    .map(({ brands, ...c }) => ({ ...num(c as Campaign, CAMPAIGN_NUMS), brandName: (brands as { name: string } | null)?.name ?? '' }));
  const budgets = await loadBudgets(openList);
  return {
    name: creator?.display_name ?? '',
    tiktok: account ? { username: account.username, followers: account.follower_count } : null,
    payoutsEnabled: creator?.payouts_enabled ?? false,
    enrollments: (enrollments ?? []).map(({ campaigns, ...e }) => {
      const { brands, conversion_pixels, ...c } = campaigns as Record<string, unknown>;
      const sub = (subs ?? []).find((s) => s.campaign_id === e.campaign_id);
      return {
        enrollment: e as Enrollment,
        campaign: num(c as unknown as Campaign, CAMPAIGN_NUMS),
        brandName: (brands as { name: string } | null)?.name ?? '',
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
    db.from('campaigns').select('*, brands(name), conversion_pixels(shop_domain)').eq('id', id).maybeSingle(),
    db.from('campaign_creators').select('*').eq('campaign_id', id).eq('creator_id', creatorId).maybeSingle(),
    db.from('submissions').select('*').eq('campaign_id', id).eq('creator_id', creatorId).maybeSingle(),
    db.from('creators').select('payouts_enabled').eq('id', creatorId).single(),
    createAdminClient().from('social_accounts').select('id').eq('creator_id', creatorId).eq('platform', 'tiktok').maybeSingle(),
  ]);
  if (!campaign) return null;
  const { brands, conversion_pixels, ...rest } = campaign;
  const c = num(rest as Campaign, CAMPAIGN_NUMS);
  const { creators, ...budget } = (await loadBudgets([c])).get(c.id)!;
  return {
    campaign: { ...c, brandName: (brands as { name: string } | null)?.name ?? '', budget, creators },
    shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
    enrollment: (enrollment as Enrollment | null) ?? null,
    submission: sub ? num(sub as Submission, SUB_NUMS) : null,
    tiktokConnected: !!account,
    payoutsEnabled: creator?.payouts_enabled ?? false,
    moments: await loadMoments(c.id, creatorId),
  };
}
