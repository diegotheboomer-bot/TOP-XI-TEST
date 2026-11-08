import { redirect } from 'next/navigation';
import { isDemo } from './env';
import { getViewer } from './session';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import * as demo from './demo';
import type { Campaign, Enrollment, Submission } from './types';

export type CampaignSummary = Campaign & { submissions: number; views: number; conversions: number; earned: number };
export type SubmissionRow = Submission & { creator_name: string };

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
}

export interface CreatorDashboard {
  name: string;
  tiktok: { username: string | null; followers: number | null } | null;
  payoutsEnabled: boolean;
  enrollments: { enrollment: Enrollment; campaign: Campaign; brandName: string; shopDomain: string | null; submission: Submission | null }[];
  openCampaigns: (Campaign & { brandName: string })[];
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

export async function getBrandDashboard(): Promise<BrandDashboard> {
  if (isDemo) return demo.brandDashboard();
  const brandId = await requireRole('brand');
  const db = createClient();
  const [{ data: brand }, { data: campaigns }, { data: subs }] = await Promise.all([
    db.from('brands').select('name').eq('id', brandId).single(),
    db.from('campaigns').select('*').eq('brand_id', brandId).order('created_at', { ascending: false }),
    db.from('submissions').select('campaign_id, current_view_count, current_conversions, payout_earned'),
  ]);
  return {
    brandName: brand?.name ?? '',
    campaigns: (campaigns ?? []).map((c) => {
      const own = (subs ?? []).filter((s) => s.campaign_id === c.id);
      return {
        ...num(c as Campaign, CAMPAIGN_NUMS),
        submissions: own.length,
        views: own.reduce((a, s) => a + s.current_view_count, 0),
        conversions: own.reduce((a, s) => a + s.current_conversions, 0),
        earned: own.reduce((a, s) => a + Number(s.payout_earned), 0),
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
  return {
    campaign: num(rest as Campaign, CAMPAIGN_NUMS),
    shopDomain: (conversion_pixels as { shop_domain: string | null } | null)?.shop_domain ?? null,
    submissions: (subs ?? []).map(({ creators, ...s }) => ({
      ...num(s as Submission, SUB_NUMS),
      creator_name: (creators as { display_name: string } | null)?.display_name ?? 'Creator',
    })),
    deposited: sum('deposit'),
    paidOut: sum('creator_payout'),
    fees: sum('platform_fee'),
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
    openCampaigns: (open ?? [])
      .filter((c) => !joined.has(c.id))
      .map(({ brands, ...c }) => ({ ...num(c as Campaign, CAMPAIGN_NUMS), brandName: (brands as { name: string } | null)?.name ?? '' })),
  };
}
