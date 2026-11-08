// Sample data shown only when Supabase is not configured (the UI shows a "Demo data" badge).
import type { BrandDashboard, CampaignDetail, CreatorDashboard, SubmissionRow } from './data';
import type { Campaign } from './types';

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const campaigns: Campaign[] = [
  { id: 'demo-spring', brand_id: 'demo', title: 'Spring Cold Brew Launch', payout_model: 'hybrid', escrow_balance: 1340, base_payout: 50, cpm_rate: 2.5, cpm_cap: 400, cps_commission_pct: 0, code_prefix: 'BREW', pixel_id: 'px', asset_folder_url: null, status: 'active', created_at: ago(400) },
  { id: 'demo-bundle', brand_id: 'demo', title: 'Holiday Gift Bundle', payout_model: 'cps_performance', escrow_balance: 3000, base_payout: 0, cpm_rate: 0, cpm_cap: 600, cps_commission_pct: 12, code_prefix: 'GIFT', pixel_id: 'px', asset_folder_url: null, status: 'active', created_at: ago(120) },
  { id: 'demo-draft', brand_id: 'demo', title: 'Morning Routine Series', payout_model: 'pure_cpm', escrow_balance: 0, base_payout: 0, cpm_rate: 3, cpm_cap: 300, cps_commission_pct: 0, code_prefix: 'MORN', pixel_id: null, asset_folder_url: null, status: 'draft', created_at: ago(20) },
];

const sub = (id: string, campaign: string, creator: string, views: number, comments: number, conv: number, earned: number, transferred: number, status: SubmissionRow['status'], fraud = 0, flag: string | null = null): SubmissionRow => ({
  id, campaign_id: campaign, creator_id: creator, creator_name: creator, platform: 'tiktok',
  video_url: `https://www.tiktok.com/video/73${id.padStart(17, '0')}`, social_platform_video_id: `73${id.padStart(17, '0')}`,
  current_view_count: views, current_like_count: Math.round(views * 0.08), current_comment_count: comments, current_conversions: conv,
  payout_earned: earned, payout_transferred: transferred, status, fraud_score: fraud, flag_reason: flag, phash: null,
  last_synced_at: ago(1.5), created_at: ago(200),
});

const submissions: SubmissionRow[] = [
  sub('1', 'demo-spring', '@mayamakes', 128_400, 1_930, 41, 371, 300, 'live_tracking'),
  sub('2', 'demo-spring', '@thebrewlab', 86_250, 1_104, 23, 265.62, 0, 'live_tracking'),
  sub('3', 'demo-spring', '@jonnyeats', 12_900, 211, 4, 0, 0, 'pending_review'),
  sub('4', 'demo-spring', '@viral.daily', 402_000, 38, 0, 120, 0, 'flagged', 90, 'Bot farm activity: 2,740 views/min, 0.009% comment ratio'),
  sub('5', 'demo-bundle', '@giftguru', 54_100, 812, 37, 214.8, 0, 'live_tracking'),
];

export function brandDashboard(): BrandDashboard {
  return {
    brandName: 'Northwind Coffee',
    campaigns: campaigns.map((c) => {
      const own = submissions.filter((s) => s.campaign_id === c.id);
      return {
        ...c,
        submissions: own.length,
        views: own.reduce((a, s) => a + s.current_view_count, 0),
        conversions: own.reduce((a, s) => a + s.current_conversions, 0),
        earned: own.reduce((a, s) => a + s.payout_earned, 0),
      };
    }),
  };
}

export function campaignDetail(id: string): CampaignDetail | null {
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) return null;
  const own = submissions.filter((s) => s.campaign_id === id);
  const paid = own.reduce((a, s) => a + s.payout_transferred, 0);
  return {
    campaign,
    shopDomain: campaign.pixel_id ? 'northwind-coffee.myshopify.com' : null,
    submissions: own,
    deposited: campaign.escrow_balance + paid,
    paidOut: paid * 0.85,
    fees: paid * 0.15,
  };
}

export function creatorDashboard(): CreatorDashboard {
  const [spring, bundle] = campaigns;
  return {
    name: 'Maya',
    tiktok: { username: 'mayamakes', followers: 48_200 },
    payoutsEnabled: true,
    enrollments: [
      {
        enrollment: { id: 'e1', campaign_id: spring.id, creator_id: 'me', ref_param: 'c9f1a2b4_demo-spring', discount_code: 'BREW7K2Q' },
        campaign: spring,
        brandName: 'Northwind Coffee',
        shopDomain: 'northwind-coffee.myshopify.com',
        submission: submissions[0],
      },
      {
        enrollment: { id: 'e2', campaign_id: bundle.id, creator_id: 'me', ref_param: 'c9f1a2b4_demo-bundle', discount_code: 'GIFT4MXP' },
        campaign: bundle,
        brandName: 'Northwind Coffee',
        shopDomain: 'northwind-coffee.myshopify.com',
        submission: null,
      },
    ],
    openCampaigns: [
      { ...campaigns[0], id: 'demo-open-1', title: 'Desk Setup Tour', payout_model: 'pure_cpm', cpm_rate: 4, cpm_cap: 500, brandName: 'Fieldnote Studio' },
      { ...campaigns[0], id: 'demo-open-2', title: 'Trail Run Essentials', payout_model: 'hybrid', base_payout: 75, cpm_rate: 2, cpm_cap: 350, brandName: 'Ridgeline Outdoor' },
    ],
  };
}
