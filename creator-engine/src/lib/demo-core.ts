// Demo store core: seed data and every demo action as pure functions over a state object.
// No server-only imports, so it runs in Next (src/lib/demo.ts) and in the
// standalone browser demo (standalone/). Mock money, invented numbers, fictional brands.
// Every streamer, clipper and number is invented.
import type { BrandDashboard, CampaignDetail, CreatorCampaignDetail, CreatorDashboard, MarketCampaign, MomentRow, SubmissionRow } from './data';
import type { Campaign, Enrollment, Moment, Platform, Submission } from './types';
import type { ActionState } from '@/actions/result';
import { calculatePayout, streamerCharge } from './payout';
import { usd, usdCents } from './format';
import { detectBotVelocity } from './fraud';
import { parseVideoUrl } from './video-url';
import { generateDiscountCode, refParam } from './attribution';
import { budgetStats, type BudgetStats } from './budget';
import { shouldAutoApprove } from './compliance';
import { HOLD_HOURS, MIN_AUTO_PAYOUT, autoPayoutDue, streamerCanFlag } from './payout-rules';
import type { MomentInput } from './schemas';
import { PAYOUT_METHOD_LABEL, payoutDestination, payoutReady, type PayoutMethod, type PayoutSetup } from './payout-methods';

interface DemoCreator {
  id: string;
  handle: string;
  displayName: string;
  followers: number;
  tiktokConnected: boolean;
  /** Stripe Connect onboarding finished. */
  payoutsEnabled: boolean;
  payoutMethod: PayoutMethod;
  /** PayPal email or Venmo number; null for Stripe. */
  payoutHandle: string | null;
}
type DemoCampaign = Campaign & { shopDomain: string | null };
type DemoSubmission = Submission & { prevSample: { at: number; views: number; comments: number } };
interface Ledger {
  campaignId: string;
  type: 'deposit' | 'creator_payout' | 'platform_fee' | 'refund';
  amount: number;
}
interface Conversion {
  campaignId: string;
  enrollmentId: string;
  total: number;
}
export interface DemoState {
  feePercent: number;
  /** Campaign owners. In the product these are streamers. */
  brands: { id: string; name: string; handle: string }[];
  /** Clippers. */
  creators: DemoCreator[];
  campaigns: DemoCampaign[];
  enrollments: Enrollment[];
  submissions: DemoSubmission[];
  conversions: Conversion[];
  ledger: Ledger[];
  moments: Moment[];
}
type State = DemoState;

export const DEMO_BRAND_ID = 'b-marlow';
const randomUUID = () => globalThis.crypto.randomUUID();
const PLATFORM_NAME: Record<Platform, string> = { tiktok: 'TikTok', youtube: 'YouTube Shorts', instagram: 'Instagram Reels' };

const HOUR = 3_600_000;
const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString();
const cents = (n: number) => Math.round(n * 100) / 100;

// Fictional clippers. Roles by position: [0] default viewer, [1] fully paid,
// [2] owed a payout, [3] awaiting review, [4] top merch seller,
// [5] payouts not set up, [6] nothing connected yet.
const CLIPPERS: [string, string, number][] = [
  ['clipsbyrae', 'Rae', 412_000],
  ['vodvault', 'VOD Vault', 865_000],
  ['framejump', 'Frame Jump', 238_000],
  ['cutroom', 'Cut Room', 151_000],
  ['highlightden', 'Highlight Den', 540_000],
  ['kayclips', 'Kay', 129_000],
  ['shortsmith', 'Shortsmith', 47_000],
];

// ─── Seed ──────────────────────────────────────────────────────────────────
/**
 * Everything here is invented: streamers, clippers, numbers and money.
 * `assetBase` is where the campaign photos are served from ('/demo/thumbs/' in
 * Next, 'thumbs/' in the standalone page).
 */
export function seedDemo(feePercent: number, assetBase: string): State {
  const brands = [
    { id: DEMO_BRAND_ID, name: 'Marlow Kade', handle: 'marlowkade' },
    { id: 'b-pixelpilot', name: 'Pixel Pilot', handle: 'pixelpilot' },
    { id: 'b-soralane', name: 'Sora Lane', handle: 'soralane' },
    { id: 'b-bigdex', name: 'Big Dex', handle: 'bigdex' },
  ];

  const creator = (handle: string, displayName: string, followers: number): DemoCreator => ({
    id: `cr-${handle.replace(/\W/g, '')}`,
    handle,
    displayName,
    followers,
    tiktokConnected: true,
    payoutsEnabled: true,
    payoutMethod: 'stripe',
    payoutHandle: null,
  });
  const [a, b, c, d, e, f, h] = CLIPPERS.map(([handle, name, followers]) => creator(handle, name, followers));
  f.payoutsEnabled = false;
  // Some clippers prefer PayPal or Venmo (reserved example domain / fictional 555-01xx number).
  Object.assign(b, { payoutsEnabled: false, payoutMethod: 'paypal', payoutHandle: 'vodvault@example.com' });
  Object.assign(e, { payoutsEnabled: false, payoutMethod: 'venmo', payoutHandle: '+12015550123' });
  h.tiktokConnected = false;
  h.payoutsEnabled = false;
  const creators = [
    a, b, c, d, e, f, h,
    // fictional accounts used for fraud and compliance examples
    creator('clipfarm.247', 'clipfarm.247', 41_000),
    creator('reupload.king', 'reupload.king', 9_800),
    creator('dailyclips.hq', 'dailyclips.hq', 64_000),
  ];

  const photo = (name: string) => `${assetBase}${name}.jpg`;
  const STANDARD = ['Your clip code in the caption', 'Include #ad in the caption'];
  const campaign = (x: Partial<DemoCampaign> & Pick<Campaign, 'id' | 'brand_id' | 'title' | 'payout_model' | 'cpm_cap' | 'code_prefix'>): DemoCampaign => ({
    escrow_balance: 0,
    base_payout: 0,
    cpm_rate: 0,
    cps_commission_pct: 0,
    pixel_id: null,
    asset_folder_url: null,
    status: 'active',
    created_at: iso(300),
    shopDomain: null,
    thumbnail_url: null,
    cover_color: '#18181b',
    brief: null,
    requirements: [],
    auto_approve_hours: 48,
    platforms: ['tiktok', 'youtube', 'instagram'],
    ...x,
  });
  const campaigns = [
    campaign({
      id: 'cmp-ranked', brand_id: DEMO_BRAND_ID, title: 'Ranked Grind Highlights', payout_model: 'pure_cpm', cpm_rate: 2, cpm_cap: 1500,
      code_prefix: 'RANK', escrow_balance: 9_000, created_at: iso(500), thumbnail_url: photo('controller-blue'), cover_color: '#0e2a47',
      brief: 'I stream ranked every night. Cut the clutches, the rage and the comebacks. Vertical, captions on, and keep the moment in the first three seconds.',
      requirements: [...STANDARD, 'Credit @marlowkade on screen', 'Vertical 9:16 with captions', '15 to 60 seconds'],
      asset_folder_url: 'https://example.com/marlowkade/vods',
    }),
    campaign({
      id: 'cmp-charity', brand_id: DEMO_BRAND_ID, title: 'Charity Marathon Moments', payout_model: 'hybrid', base_payout: 40, cpm_rate: 1.5, cpm_cap: 800,
      code_prefix: 'CHAR', escrow_balance: 6_000, created_at: iso(160), thumbnail_url: photo('stage-lights'), cover_color: '#4a2a1c',
      platforms: ['tiktok', 'youtube'],
      brief: '24 hours live for the food bank. Clip the goal moments and the chaos, and mention the donation link in your caption.',
      requirements: [...STANDARD, 'Mention the charity in the caption'],
    }),
    campaign({
      id: 'cmp-merch', brand_id: DEMO_BRAND_ID, title: 'Hoodie Drop Clips', payout_model: 'cps_performance', cps_commission_pct: 12, cpm_cap: 1000,
      code_prefix: 'HOOD', escrow_balance: 4_000, created_at: iso(200), thumbnail_url: photo('gamer-couch'), cover_color: '#3d3320',
      shopDomain: 'marlowkade.myshopify.com',
      brief: 'Clip me wearing the new hoodie on stream. Your clip code doubles as 10% off for viewers, and you earn 12% of every order.',
      requirements: [...STANDARD, 'Say your code out loud or show it on screen'],
    }),
    campaign({
      id: 'cmp-podcast', brand_id: DEMO_BRAND_ID, title: 'Off-Stream Podcast Takes', payout_model: 'pure_cpm', cpm_rate: 1.2, cpm_cap: 600,
      code_prefix: 'POD', status: 'draft', created_at: iso(10), thumbnail_url: photo('studio-mic'), cover_color: '#2a1f4a',
      platforms: ['youtube', 'instagram'],
      brief: 'Weekly podcast with the squad. Pull the hottest takes.', requirements: [...STANDARD],
    }),
    campaign({
      id: 'cmp-speedrun', brand_id: 'b-pixelpilot', title: 'World Record Attempts', payout_model: 'pure_cpm', cpm_rate: 2.5, cpm_cap: 2000,
      code_prefix: 'WR', escrow_balance: 12_000, thumbnail_url: photo('keyboard-dark'), cover_color: '#16403a',
      brief: 'Every WR attempt, every reset. Show the split timer so people know what is at stake.', requirements: [...STANDARD, 'Split timer visible'],
    }),
    campaign({
      id: 'cmp-karaoke', brand_id: 'b-soralane', title: 'Late Night Karaoke', payout_model: 'pure_cpm', cpm_rate: 1.5, cpm_cap: 900,
      code_prefix: 'SING', escrow_balance: 5_000, thumbnail_url: photo('mic-purple'), cover_color: '#4c1d4a', platforms: ['tiktok', 'instagram'],
      brief: 'Karaoke Fridays. The high notes, the misses and chat losing it.', requirements: [...STANDARD, 'Keep the original audio'],
    }),
    campaign({
      id: 'cmp-coop', brand_id: 'b-bigdex', title: 'Couch Co-op Chaos', payout_model: 'hybrid', base_payout: 25, cpm_rate: 1.75, cpm_cap: 1200,
      code_prefix: 'COOP', escrow_balance: 7_500, thumbnail_url: photo('couch-coop'), cover_color: '#7f1d1d',
      brief: 'Me and my brother ruining every co-op game. Betrayals especially welcome.', requirements: [...STANDARD],
    }),
  ];

  const enrollments: Enrollment[] = [];
  const enroll = (creatorId: string, campaignId: string, code: string) => {
    const en = { id: `en-${creatorId}-${campaignId}`, campaign_id: campaignId, creator_id: creatorId, ref_param: refParam(creatorId, campaignId), discount_code: code };
    enrollments.push(en);
    return en;
  };

  let n = 0;
  const videoUrl = (platform: Platform) => {
    n++;
    if (platform === 'youtube') {
      const id = `Mk${String(n).padStart(2, '0')}Clp_x9Q`.slice(0, 11);
      return { id, url: `https://www.youtube.com/shorts/${id}` };
    }
    if (platform === 'instagram') {
      const id = `C${String(n).padStart(3, '0')}rlMkQz`;
      return { id, url: `https://www.instagram.com/reel/${id}/` };
    }
    const id = String(7_310_000_000_000_000_000n + BigInt(n) * 7_919_133n);
    return { id, url: `https://www.tiktok.com/video/${id}` };
  };

  const submissions: DemoSubmission[] = [];
  const submit = (creatorId: string, campaignId: string, platform: Platform, views: number, commentRate: number, x: Partial<Submission> = {}) => {
    const comments = Math.round(views * commentRate);
    const v = videoUrl(platform);
    submissions.push({
      id: `sub-${creatorId}-${campaignId}`,
      campaign_id: campaignId,
      creator_id: creatorId,
      platform,
      video_url: v.url,
      social_platform_video_id: v.id,
      current_view_count: views,
      current_like_count: Math.round(views * 0.09),
      current_comment_count: comments,
      current_conversions: 0,
      payout_earned: 0,
      payout_transferred: 0,
      status: 'live_tracking',
      fraud_score: 0,
      flag_reason: null,
      phash: null,
      has_disclosure: true,
      last_synced_at: iso(1.2),
      // Approved long ago, so the hold has passed and the next sync pays them automatically.
      approved_at: x.status === 'pending_review' || x.status === 'flagged' ? null : iso(100),
      created_at: iso(120),
      prevSample: { at: Date.now() - 1.2 * HOUR, views, comments },
      ...x,
    });
  };

  // Ranked Grind Highlights: views only
  enroll(a.id, 'cmp-ranked', 'RANKR4E7');
  enroll(b.id, 'cmp-ranked', 'RANKV8LT');
  enroll(c.id, 'cmp-ranked', 'RANKF2JP');
  enroll(d.id, 'cmp-ranked', 'RANKC6RM');
  enroll('cr-clipfarm247', 'cmp-ranked', 'RANKX9CF');
  enroll('cr-dailyclipshq', 'cmp-ranked', 'RANKD3HQ');
  submit(a.id, 'cmp-ranked', 'tiktok', 420_300, 0.014, { payout_transferred: 500 });
  submit(b.id, 'cmp-ranked', 'youtube', 1_104_000, 0.009, { payout_transferred: 1500, status: 'paid' });
  // Approved 20 hours ago: still in the hold, so the streamer can flag it and it isn't paid yet.
  submit(c.id, 'cmp-ranked', 'instagram', 310_600, 0.011, { approved_at: iso(20) });
  submit(d.id, 'cmp-ranked', 'tiktok', 96_400, 0.013, { status: 'pending_review', created_at: iso(30) });
  submit('cr-clipfarm247', 'cmp-ranked', 'tiktok', 486_000, 0.00008, {
    status: 'flagged', fraud_score: 90, flag_reason: 'Bot farm activity: 3,120 views/min, 0.008% comment ratio',
  });
  // Overdue but not auto-approved: the caption is missing #ad.
  submit('cr-dailyclipshq', 'cmp-ranked', 'youtube', 41_800, 0.009, { status: 'pending_review', created_at: iso(52), has_disclosure: false });

  // Charity Marathon: base fee + views
  enroll(e.id, 'cmp-charity', 'CHARH5DN');
  enroll(c.id, 'cmp-charity', 'CHARF7KQ');
  submit(e.id, 'cmp-charity', 'youtube', 152_000, 0.012);
  submit(c.id, 'cmp-charity', 'tiktok', 88_400, 0.015);

  // Hoodie Drop: merch commission
  enroll(e.id, 'cmp-merch', 'HOODH8DN');
  enroll(f.id, 'cmp-merch', 'HOODK3YC');
  enroll(a.id, 'cmp-merch', 'HOODR2AE');
  enroll('cr-reuploadking', 'cmp-merch', 'HOODR7PK');
  submit(e.id, 'cmp-merch', 'tiktok', 233_000, 0.012);
  submit(f.id, 'cmp-merch', 'instagram', 141_500, 0.017);
  submit('cr-reuploadking', 'cmp-merch', 'tiktok', 22_400, 0.004, {
    status: 'flagged', fraud_score: 100, flag_reason: 'Duplicate content: >95% match with another clip in this campaign',
  });

  // Other streamers' campaigns
  enroll(a.id, 'cmp-speedrun', 'WRR4E7XQ');
  submit(a.id, 'cmp-speedrun', 'youtube', 233_000, 0.012);
  enroll(b.id, 'cmp-karaoke', 'SINGV8LT');
  submit(b.id, 'cmp-karaoke', 'tiktok', 88_000, 0.02);
  enroll(d.id, 'cmp-coop', 'COOPC6RM');
  submit(d.id, 'cmp-coop', 'instagram', 140_000, 0.016);

  const conversions: Conversion[] = [];
  const sales = (creatorId: string, campaignId: string, count: number, avg: number) => {
    const en = enrollments.find((x) => x.creator_id === creatorId && x.campaign_id === campaignId)!;
    for (let i = 0; i < count; i++) conversions.push({ campaignId, enrollmentId: en.id, total: cents(avg * (0.7 + ((i * 37) % 60) / 100)) });
  };
  sales(e.id, 'cmp-merch', 180, 55);
  sales(f.id, 'cmp-merch', 90, 52);

  const mom = (campaignId: string, title: string, timestamp_label: string, claimed_by: string[] = [], max_claims = 3): Moment => ({
    id: `mo-${campaignId}-${timestamp_label.replace(/:/g, '')}`, campaign_id: campaignId, title, timestamp_label, vod_url: null, max_claims, claimed_by,
  });
  const moments: Moment[] = [
    mom('cmp-ranked', '1v4 clutch to win the round', '2:14:05', [c.id]),
    mom('cmp-ranked', 'Chat roasts my aim for ten minutes straight', '0:48:12'),
    mom('cmp-ranked', 'The rage quit that wasn’t', '3:02:40', [a.id, d.id], 2),
    mom('cmp-charity', 'Donation goal smashed at 4am', '5:31:00', [e.id]),
    mom('cmp-charity', 'Head shave reveal', '7:02:15'),
    mom('cmp-merch', 'Hoodie unboxing', '0:12:30', [e.id, f.id]),
    mom('cmp-speedrun', 'Frame-perfect skip', '0:22:47', [a.id]),
    mom('cmp-speedrun', 'On WR pace at the last split', '1:05:10'),
    mom('cmp-karaoke', 'Hit the high note (finally)', '1:12:30', [b.id]),
    mom('cmp-coop', 'Friendly-fire disaster', '0:37:52', [d.id]),
  ];

  const state: State = { feePercent, brands, creators, campaigns, enrollments, submissions, conversions, ledger: [], moments };

  // Derive counters and earnings with the real payout function.
  for (const s of submissions) {
    const enrollment = enrollments.find((en) => en.creator_id === s.creator_id && en.campaign_id === s.campaign_id)!;
    s.current_conversions = conversions.filter((cv) => cv.enrollmentId === enrollment.id).length;
    if (s.status === 'pending_review') continue;
    const camp = campaigns.find((x) => x.id === s.campaign_id)!;
    s.payout_earned = calculatePayout(camp, s.current_view_count, revenueFor(state, enrollment.id));
    if (s.status === 'flagged') s.payout_earned = cents(s.payout_earned * 0.35); // accrual froze earlier
  }

  // Ledger: deposits cover current escrow plus everything already paid, with the
  // streamer's fee recorded alongside each deposit. Clippers were paid in full.
  for (const camp of campaigns) {
    const paid = submissions.filter((s) => s.campaign_id === camp.id).reduce((acc, s) => acc + s.payout_transferred, 0);
    if (camp.escrow_balance + paid > 0) {
      const { budget, fee } = streamerCharge(camp.escrow_balance + paid, feePercent);
      state.ledger.push({ campaignId: camp.id, type: 'deposit', amount: budget }, { campaignId: camp.id, type: 'platform_fee', amount: fee });
    }
    for (const s of submissions.filter((x) => x.campaign_id === camp.id && x.payout_transferred > 0)) {
      state.ledger.push({ campaignId: camp.id, type: 'creator_payout', amount: s.payout_transferred });
    }
  }
  return state;
}

function revenueFor(s: State, enrollmentId: string) {
  return s.conversions.filter((c) => c.enrollmentId === enrollmentId).reduce((a, c) => a + c.total, 0);
}
const enrollmentOf = (s: State, sub: Submission) => s.enrollments.find((e) => e.creator_id === sub.creator_id && e.campaign_id === sub.campaign_id)!;
const strip = ({ shopDomain: _s, ...c }: DemoCampaign): Campaign => c;
const stripSub = ({ prevSample: _p, ...s }: DemoSubmission): Submission => s;

export const defaultCreatorId = (s: State) => s.creators[0].id;
export const hasCreator = (s: State, id: string) => s.creators.some((c) => c.id === id);
export const demoCreators = (s: State) => s.creators.filter((c) => !c.handle.includes('.')).map((c) => ({ id: c.id, name: c.displayName }));

// ─── Queries ───────────────────────────────────────────────────────────────
function budgetOf(s: State, c: DemoCampaign): BudgetStats {
  const total = (type: Ledger['type']) => s.ledger.filter((l) => l.campaignId === c.id && l.type === type).reduce((a, l) => a + l.amount, 0);
  const deposited = total('deposit') - total('refund');
  const owed = s.submissions
    .filter((x) => x.campaign_id === c.id && x.status === 'live_tracking')
    .reduce((a, x) => a + x.payout_earned - x.payout_transferred, 0);
  return budgetStats({ deposited, escrow: c.escrow_balance, owed, createdAt: c.created_at });
}

const brandNameOf = (s: State, id: string) => s.brands.find((b) => b.id === id)?.name ?? '';

function momentRows(s: State, campaignId: string, viewer?: string): MomentRow[] {
  return s.moments
    .filter((m) => m.campaign_id === campaignId)
    .map((m) => ({
      ...m,
      claimers: m.claimed_by.map((id) => '@' + (s.creators.find((c) => c.id === id)?.handle ?? 'clipper')),
      mine: !!viewer && m.claimed_by.includes(viewer),
    }));
}

function market(s: State, c: DemoCampaign): MarketCampaign {
  return { ...strip(c), brandName: brandNameOf(s, c.brand_id), budget: budgetOf(s, c), creators: s.submissions.filter((x) => x.campaign_id === c.id).length };
}

export function brandDashboard(s: State): BrandDashboard {
  return {
    brandName: brandNameOf(s, DEMO_BRAND_ID),
    campaigns: s.campaigns
      .filter((c) => c.brand_id === DEMO_BRAND_ID)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => {
        const own = s.submissions.filter((x) => x.campaign_id === c.id);
        return {
          ...strip(c),
          submissions: own.length,
          pendingReview: own.filter((x) => x.status === 'pending_review').length,
          views: own.reduce((a, x) => a + x.current_view_count, 0),
          conversions: own.reduce((a, x) => a + x.current_conversions, 0),
          earned: own.reduce((a, x) => a + x.payout_earned, 0),
          budget: budgetOf(s, c),
        };
      }),
  };
}

export function campaignDetail(s: State, id: string): CampaignDetail | null {
  const c = s.campaigns.find((x) => x.id === id && x.brand_id === DEMO_BRAND_ID);
  if (!c) return null;
  const sum = (type: Ledger['type']) => cents(s.ledger.filter((l) => l.campaignId === id && l.type === type).reduce((a, l) => a + l.amount, 0));
  const order = { pending_review: 0, flagged: 1, live_tracking: 2, paid: 3 } as const;
  return {
    campaign: strip(c),
    shopDomain: c.shopDomain,
    submissions: s.submissions
      .filter((x) => x.campaign_id === id)
      .sort((a, b) => order[a.status] - order[b.status] || b.current_view_count - a.current_view_count)
      .map((x): SubmissionRow => ({ ...stripSub(x), creator_name: '@' + s.creators.find((cr) => cr.id === x.creator_id)!.handle })),
    deposited: cents(sum('deposit') - sum('refund')),
    refunded: sum('refund'),
    paidOut: sum('creator_payout'),
    fees: sum('platform_fee'),
    budget: budgetOf(s, c),
    moments: momentRows(s, id),
  };
}

export function creatorDashboard(s: State, viewer: string): CreatorDashboard {
  const me = s.creators.find((c) => c.id === viewer) ?? s.creators[0];
  const mine = s.enrollments.filter((e) => e.creator_id === me.id);
  return {
    name: me.displayName,
    tiktok: me.tiktokConnected ? { username: me.handle, followers: me.followers } : null,
    payoutsEnabled: payoutReady(payoutSetupOf(me)),
    payout: payoutSetupOf(me),
    enrollments: mine.map((e) => {
      const c = s.campaigns.find((x) => x.id === e.campaign_id)!;
      const sub = s.submissions.find((x) => x.creator_id === me.id && x.campaign_id === c.id);
      return { enrollment: e, campaign: strip(c), brandName: brandNameOf(s, c.brand_id), shopDomain: c.shopDomain, submission: sub ? stripSub(sub) : null };
    }),
    openCampaigns: s.campaigns.filter((c) => c.status === 'active' && !mine.some((e) => e.campaign_id === c.id)).map((c) => market(s, c)),
  };
}

export function creatorCampaign(s: State, viewer: string, id: string): CreatorCampaignDetail | null {
  const me = s.creators.find((c) => c.id === viewer) ?? s.creators[0];
  const c = s.campaigns.find((x) => x.id === id);
  if (!c) return null;
  const enrollment = s.enrollments.find((e) => e.creator_id === me.id && e.campaign_id === id) ?? null;
  if (c.status !== 'active' && !enrollment) return null;
  const sub = s.submissions.find((x) => x.creator_id === me.id && x.campaign_id === id);
  return {
    campaign: market(s, c),
    shopDomain: c.shopDomain,
    enrollment,
    submission: sub ? stripSub(sub) : null,
    tiktokConnected: me.tiktokConnected,
    payoutsEnabled: payoutReady(payoutSetupOf(me)),
    moments: momentRows(s, id, me.id),
  };
}

// ─── Brand actions ─────────────────────────────────────────────────────────
const ownCampaign = (s: State, id: string) => s.campaigns.find((c) => c.id === id && c.brand_id === DEMO_BRAND_ID);

export function createCampaign(s: State, input: Omit<Campaign, 'id' | 'brand_id' | 'escrow_balance' | 'pixel_id' | 'status' | 'created_at'>): string {
  const id = `cmp-${randomUUID().slice(0, 8)}`;
  s.campaigns.push({ ...input, id, brand_id: DEMO_BRAND_ID, escrow_balance: 0, pixel_id: null, status: 'draft', created_at: new Date().toISOString(), shopDomain: null });
  return id;
}

export function setCampaignStatus(s: State, id: string, status: Campaign['status']): ActionState {
  const c = ownCampaign(s, id);
  if (!c) return { error: 'Campaign not found.' };
  if (c.status === 'completed') return { error: 'This campaign has ended.' };
  if (status === 'active' && c.escrow_balance <= 0) return { error: 'Fund escrow before going live.' };
  c.status = status;
  return { success: `Campaign ${status}.` };
}

export function fundEscrow(s: State, id: string, amount: number): ActionState {
  const c = ownCampaign(s, id);
  if (!c) return { error: 'Campaign not found.' };
  if (c.status === 'completed') return { error: 'This campaign has ended.' };
  const { budget, fee, total } = streamerCharge(amount, s.feePercent);
  c.escrow_balance = cents(c.escrow_balance + budget);
  s.ledger.push({ campaignId: id, type: 'deposit', amount: budget }, { campaignId: id, type: 'platform_fee', amount: fee });
  return { success: `Charged ${usdCents(total)}: ${usd(budget)} added to the clipper budget plus ${usdCents(fee)} fee. Mock money.` };
}

/**
 * Ends the campaign and refunds the unspent budget (mock). Earnings stop
 * growing; approved clips keep what they've earned. The fee isn't refunded.
 * On an ended campaign it refunds whatever has been freed up since.
 */
export function cancelCampaign(s: State, id: string): ActionState {
  const c = ownCampaign(s, id);
  if (!c) return { error: 'Campaign not found.' };
  const wasLive = c.status !== 'completed';
  c.status = 'completed';
  const refund = cents(budgetOf(s, c).available);
  if (refund > 0) {
    c.escrow_balance = cents(c.escrow_balance - refund);
    s.ledger.push({ campaignId: id, type: 'refund', amount: refund });
  }
  const refunded = refund > 0 ? `${usdCents(refund)} refunded to your card (mock).` : 'Nothing left to refund.';
  return { success: wasLive ? `Campaign cancelled. ${refunded}` : refunded };
}

export function connectStore(s: State, id: string, domain: string): ActionState {
  const c = ownCampaign(s, id);
  if (!c) return { error: 'Campaign not found.' };
  c.shopDomain = domain;
  return { success: 'Store connected (mock).' };
}

export function reviewSubmission(s: State, id: string, decision: 'approve' | 'flag'): ActionState {
  const sub = s.submissions.find((x) => x.id === id);
  if (!sub || !ownCampaign(s, sub.campaign_id)) return { error: 'Submission not found.' };
  if (decision === 'approve') {
    if (ownCampaign(s, sub.campaign_id)!.status === 'completed') return { error: 'This campaign has ended, so new clips can’t earn.' };
    Object.assign(sub, { status: 'live_tracking', flag_reason: null, fraud_score: 0, approved_at: new Date().toISOString() });
    const c = ownCampaign(s, sub.campaign_id)!;
    sub.payout_earned = Math.max(sub.payout_earned, calculatePayout(c, sub.current_view_count, revenueFor(s, enrollmentOf(s, sub).id)));
    return { success: 'Approved. Tracking started.' };
  }
  if (!streamerCanFlag(sub)) return { error: `Clips can only be flagged for ${HOLD_HOURS / 24} days after approval. This one is locked and will be paid.` };
  Object.assign(sub, { status: 'flagged', flag_reason: 'Flagged by the streamer' });
  return { success: 'Flagged.' };
}

/** Pays everything a clip has earned and not yet been sent. `minimum` is the smallest amount to send. */
function payOut(s: State, sub: DemoSubmission, minimum = 1): ActionState & { paid?: number } {
  const c = ownCampaign(s, sub.campaign_id);
  if (!c) return { error: 'Submission not found.' };
  const creator = s.creators.find((x) => x.id === sub.creator_id)!;
  if (sub.status !== 'live_tracking') return { error: 'Only approved, unflagged submissions can be paid.' };
  const setup = payoutSetupOf(creator);
  if (!payoutReady(setup)) return { error: `@${creator.handle} has not finished payout setup.` };
  const gross = cents(sub.payout_earned - sub.payout_transferred);
  if (gross < minimum) return { error: 'Nothing to pay out yet.' };
  if (c.escrow_balance < gross) return { error: 'Not enough escrow. Top up the campaign first.' };

  // Clippers keep 100%: the fee was charged to the streamer at deposit.
  c.escrow_balance = cents(c.escrow_balance - gross);
  sub.payout_transferred = cents(sub.payout_transferred + gross);
  s.ledger.push({ campaignId: c.id, type: 'creator_payout', amount: gross });
  if (sub.payout_transferred >= c.cpm_cap) sub.status = 'paid';
  const via = setup.method === 'stripe' ? 'their bank' : PAYOUT_METHOD_LABEL[setup.method];
  return { success: `Paid ${usdCents(gross)} to @${creator.handle} via ${via}. No fee taken. Mock money.`, paid: gross };
}

/** The streamer pays a clip early. (Approved clips are also paid automatically after the hold.) */
export function releasePayout(s: State, id: string): ActionState {
  const sub = s.submissions.find((x) => x.id === id);
  if (!sub || !ownCampaign(s, sub.campaign_id)) return { error: 'Submission not found.' };
  const { error, success } = payOut(s, sub);
  return error ? { error } : { success };
}

/**
 * One simulated 4-hour sync: views grow, the real velocity watchdog and payout
 * formula run, and 4 hours pass for review deadlines (clean, overdue
 * submissions are auto-approved).
 */
export function simulateSync(s: State, campaignId: string): ActionState {
  const c = ownCampaign(s, campaignId);
  if (!c) return { error: 'Campaign not found.' };
  if (c.status === 'completed') return { error: 'This campaign has ended. Earnings are final.' };
  const subs = s.submissions.filter((x) => x.campaign_id === campaignId && (x.status === 'live_tracking' || x.status === 'pending_review'));
  if (!subs.length) return { error: 'No live videos to sync.' };

  const now = Date.now();
  let flagged = 0;
  let approved = 0;
  for (const sub of subs) {
    // 4 hours pass for the payout hold too.
    if (sub.approved_at) sub.approved_at = new Date(new Date(sub.approved_at).getTime() - 4 * HOUR).toISOString();
    if (sub.status === 'pending_review') {
      sub.created_at = new Date(new Date(sub.created_at).getTime() - 4 * HOUR).toISOString(); // 4 hours pass
      if (shouldAutoApprove(sub, c.auto_approve_hours, now)) {
        Object.assign(sub, { status: 'live_tracking', approved_at: new Date(now).toISOString() });
        approved++;
      }
    }
    const growth = 1.04 + Math.random() * 0.22;
    const views = Math.round(sub.current_view_count * growth);
    const comments = Math.round(sub.current_comment_count + (views - sub.current_view_count) * (sub.current_comment_count / Math.max(sub.current_view_count, 1)));
    const prev = { capturedAt: new Date(now - 4 * HOUR), views: sub.current_view_count, comments: sub.current_comment_count };
    const check = detectBotVelocity(prev, { capturedAt: new Date(now), views, comments });

    Object.assign(sub, {
      current_view_count: views,
      current_comment_count: comments,
      current_like_count: Math.round(views * 0.09),
      last_synced_at: new Date(now).toISOString(),
      prevSample: { at: now, views, comments },
    });
    if (check.flagged) {
      Object.assign(sub, { status: 'flagged', fraud_score: 90, flag_reason: `Bot farm activity: ${Math.round(check.viewsPerMinute)} views/min` });
      flagged++;
    } else if (sub.status === 'live_tracking') {
      sub.payout_earned = Math.max(sub.payout_earned, calculatePayout(c, views, revenueFor(s, enrollmentOf(s, sub).id)));
      if (sub.payout_transferred >= c.cpm_cap) sub.status = 'paid';
    }
  }
  // Approved clips whose hold has passed are paid automatically.
  let paid = 0;
  for (const sub of subs) {
    const owed = sub.payout_earned - sub.payout_transferred;
    if (autoPayoutDue({ status: sub.status, approved_at: sub.approved_at, owed, campaignEnded: false }, now) && payOut(s, sub, MIN_AUTO_PAYOUT).paid) paid++;
  }
  const notes = [flagged && `${flagged} flagged`, approved && `${approved} auto-approved`, paid && `${paid} paid automatically`].filter(Boolean).join(', ');
  return { success: `Synced ${subs.length} ${subs.length === 1 ? 'video' : 'videos'}${notes ? `. ${notes}` : ''}.` };
}

/** A storefront order arrives with one creator's code or ref link. */
export function simulateSale(s: State, campaignId: string): ActionState {
  const c = ownCampaign(s, campaignId);
  if (!c) return { error: 'Campaign not found.' };
  if (c.status === 'completed') return { error: 'This campaign has ended. Earnings are final.' };
  if (!c.shopDomain) return { error: 'Connect a store first.' };
  const live = s.submissions.filter((x) => x.campaign_id === campaignId && x.status === 'live_tracking');
  if (!live.length) return { error: 'No live creators to attribute a sale to.' };

  const sub = live[Math.floor(Math.random() * live.length)];
  const enrollment = enrollmentOf(s, sub);
  const total = cents(18 + Math.random() * 90);
  s.conversions.push({ campaignId, enrollmentId: enrollment.id, total });
  sub.current_conversions++;
  if (c.payout_model === 'cps_performance') {
    sub.payout_earned = Math.max(sub.payout_earned, calculatePayout(c, sub.current_view_count, revenueFor(s, enrollment.id)));
  }
  const handle = s.creators.find((x) => x.id === sub.creator_id)!.handle;
  return { success: `${usdCents(total)} order via code ${enrollment.discount_code} → @${handle}.` };
}

export function addMoment(s: State, campaignId: string, input: MomentInput): ActionState {
  const c = ownCampaign(s, campaignId);
  if (!c) return { error: 'Campaign not found.' };
  if (c.status === 'completed') return { error: 'This campaign has ended.' };
  s.moments.unshift({ id: `mo-${randomUUID().slice(0, 8)}`, campaign_id: campaignId, ...input, vod_url: null, claimed_by: [] });
  return { success: 'Moment pinned for clippers.' };
}

// ─── Creator actions ───────────────────────────────────────────────────────
export function joinCampaign(s: State, me: string, campaignId: string): ActionState {
  const c = s.campaigns.find((x) => x.id === campaignId);
  if (!c || c.status !== 'active') return { error: 'This campaign is not accepting creators.' };
  if (s.enrollments.some((e) => e.creator_id === me && e.campaign_id === campaignId)) return { error: 'You already joined this campaign.' };
  s.enrollments.push({ id: `en-${randomUUID().slice(0, 8)}`, campaign_id: campaignId, creator_id: me, ref_param: refParam(me, campaignId), discount_code: generateDiscountCode(c.code_prefix) });
  return { success: 'Joined. Your clip code is ready.' };
}

export function submitVideo(s: State, viewer: string, campaignId: string, url: string): ActionState {
  const me = s.creators.find((c) => c.id === viewer)!;
  const enrollment = s.enrollments.find((e) => e.creator_id === me.id && e.campaign_id === campaignId);
  if (!enrollment) return { error: 'Join the campaign before submitting.' };
  const camp = s.campaigns.find((x) => x.id === campaignId)!;
  if (camp.status !== 'active') return { error: 'This campaign is not accepting submissions.' };

  const parsed = parseVideoUrl(url);
  if (!parsed.ok) {
    if (parsed.reason === 'needs_resolution') return { error: 'In demo mode, paste the full tiktok.com/@user/video/… link.' };
    return { error: parsed.reason === 'unsupported_host' ? 'Only TikTok, Instagram Reels and YouTube Shorts links are recognised.' : 'That link does not point to a single video.' };
  }
  const platform = parsed.video.platform;
  if (!camp.platforms.includes(platform)) return { error: `This campaign doesn’t accept ${PLATFORM_NAME[platform]}.` };
  // TikTok ownership comes from the clipper's login; Shorts and Reels from the clip code in the caption.
  if (platform === 'tiktok' && !me.tiktokConnected) return { error: 'Connect your TikTok account to submit TikTok clips.' };
  if (s.submissions.some((x) => x.creator_id === me.id && x.campaign_id === campaignId)) return { error: 'You already have a submission in this campaign.' };
  if (s.submissions.some((x) => x.campaign_id === campaignId && x.social_platform_video_id === parsed.video.videoId)) {
    return { error: 'This video was already submitted to this campaign.' };
  }

  // Mock platform API response: early views scale with follower count.
  const views = Math.round(me.followers * (0.004 + Math.random() * 0.01));
  const comments = Math.round(views * (0.008 + Math.random() * 0.008));
  const now = Date.now();
  s.submissions.push({
    id: `sub-${randomUUID().slice(0, 8)}`,
    campaign_id: campaignId,
    creator_id: me.id,
    platform,
    video_url: parsed.video.canonicalUrl,
    social_platform_video_id: parsed.video.videoId,
    current_view_count: views,
    current_like_count: Math.round(views * 0.09),
    current_comment_count: comments,
    current_conversions: 0,
    payout_earned: 0,
    payout_transferred: 0,
    status: 'pending_review',
    fraud_score: 0,
    flag_reason: null,
    phash: null,
    has_disclosure: true, // mock caption includes #ad
    last_synced_at: new Date(now).toISOString(),
    approved_at: null,
    created_at: new Date(now).toISOString(),
    prevSample: { at: now, views, comments },
  });
  const proof = platform === 'tiktok' ? 'Verified through your TikTok login' : `Clip code ${enrollment.discount_code} found in the caption`;
  return { success: `Submitted. ${proof}, #ad present. Auto-approves in ${camp.auto_approve_hours}h if the streamer doesn't review it first.` };
}

export function claimMoment(s: State, viewer: string, momentId: string): ActionState {
  const m = s.moments.find((x) => x.id === momentId);
  if (!m) return { error: 'Moment not found.' };
  if (s.campaigns.find((c) => c.id === m.campaign_id)?.status !== 'active') return { error: 'This campaign isn’t taking new clips.' };
  if (!s.enrollments.some((e) => e.creator_id === viewer && e.campaign_id === m.campaign_id)) return { error: 'Join the campaign to claim moments.' };
  if (m.claimed_by.includes(viewer)) return { error: 'You already claimed this moment.' };
  if (m.claimed_by.length >= m.max_claims) return { error: 'Every slot for this moment is taken.' };
  m.claimed_by.push(viewer);
  return { success: `Claimed "${m.title}". It’s yours to clip.` };
}

export function connectTikTok(s: State, viewer: string): void {
  const me = s.creators.find((c) => c.id === viewer)!;
  me.tiktokConnected = true;
}

const payoutSetupOf = (c: DemoCreator): PayoutSetup => ({ method: c.payoutMethod, handle: c.payoutHandle, stripeReady: c.payoutsEnabled, lastFailure: null });

/** Mock Stripe onboarding finished: bank or debit card through Stripe. */
export function enablePayouts(s: State, viewer: string): void {
  const me = s.creators.find((c) => c.id === viewer)!;
  Object.assign(me, { payoutsEnabled: true, payoutMethod: 'stripe', payoutHandle: null });
}

/** Clipper picks a payout method. PayPal/Venmo need a validated handle; Stripe needs onboarding. */
export function setPayoutMethod(s: State, viewer: string, method: PayoutMethod, handle: string | null): ActionState {
  const me = s.creators.find((c) => c.id === viewer)!;
  if (method !== 'stripe' && !handle) return { error: 'Enter where to send your money.' };
  Object.assign(me, { payoutMethod: method, payoutHandle: method === 'stripe' ? null : handle });
  return { success: `Payouts will go to ${payoutDestination({ method, handle })}.` };
}
