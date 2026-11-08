// Demo mode: an in-memory store with mock money, used when Supabase is not configured.
// Every action works against it using the same payout, fee and fraud logic as production.
// State lives in this server process and resets on restart (or via "Reset demo").
//
// Real streamers appear only as ordinary, positive example rows. Fraud examples use
// made-up handles. All brands are fictional. All numbers are invented.
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import type { BrandDashboard, CampaignDetail, CreatorDashboard, SubmissionRow } from './data';
import type { Campaign, Enrollment, Submission } from './types';
import type { ActionState } from '@/actions/result';
import { calculatePayout, splitFee } from './payout';
import { detectBotVelocity } from './fraud';
import { parseVideoUrl } from './video-url';
import { generateDiscountCode, refParam } from './attribution';
import { platformFeePercent } from './stripe';

interface DemoCreator {
  id: string;
  handle: string;
  displayName: string;
  followers: number;
  tiktokConnected: boolean;
  payoutsEnabled: boolean;
}
type DemoCampaign = Campaign & { shopDomain: string | null };
type DemoSubmission = Submission & { prevSample: { at: number; views: number; comments: number } };
interface Ledger {
  campaignId: string;
  type: 'deposit' | 'creator_payout' | 'platform_fee';
  amount: number;
}
interface Conversion {
  campaignId: string;
  enrollmentId: string;
  total: number;
}
interface State {
  brands: { id: string; name: string }[];
  creators: DemoCreator[];
  campaigns: DemoCampaign[];
  enrollments: Enrollment[];
  submissions: DemoSubmission[];
  conversions: Conversion[];
  ledger: Ledger[];
}

export const DEMO_BRAND_ID = 'b-voltline';
const DEFAULT_CREATOR = 'cr-kaicenat';
const CREATOR_COOKIE = 'demo_creator';

const HOUR = 3_600_000;
const iso = (hoursAgo: number) => new Date(Date.now() - hoursAgo * HOUR).toISOString();
const cents = (n: number) => Math.round(n * 100) / 100;

// ─── Seed ──────────────────────────────────────────────────────────────────
function seed(): State {
  const brands = [
    { id: DEMO_BRAND_ID, name: 'Voltline Energy' },
    { id: 'b-pixelforge', name: 'Pixelforge Peripherals' },
    { id: 'b-ridgeline', name: 'Ridgeline Outdoor' },
    { id: 'b-northwind', name: 'Northwind Coffee' },
  ];

  const creator = (handle: string, displayName: string, followers: number, extra: Partial<DemoCreator> = {}): DemoCreator => ({
    id: `cr-${handle.replace(/\W/g, '')}`,
    handle,
    displayName,
    followers,
    tiktokConnected: true,
    payoutsEnabled: true,
    ...extra,
  });
  const creators = [
    creator('kaicenat', 'Kai Cenat', 14_200_000),
    creator('ishowspeed', 'IShowSpeed', 31_500_000),
    creator('pokimane', 'Pokimane', 7_900_000),
    creator('ludwig', 'Ludwig', 2_400_000),
    creator('valkyrae', 'Valkyrae', 5_100_000),
    creator('xqc', 'xQc', 3_300_000, { payoutsEnabled: false }),
    creator('sykkuno', 'Sykkuno', 2_800_000, { tiktokConnected: false, payoutsEnabled: false }),
    // fictional accounts used for fraud examples
    creator('clipfarm.247', 'clipfarm.247', 41_000),
    creator('reupload.king', 'reupload.king', 9_800),
  ];

  const campaign = (c: Partial<DemoCampaign> & Pick<Campaign, 'id' | 'brand_id' | 'title' | 'payout_model' | 'cpm_cap' | 'code_prefix'>): DemoCampaign => ({
    escrow_balance: 0,
    base_payout: 0,
    cpm_rate: 0,
    cps_commission_pct: 0,
    pixel_id: null,
    asset_folder_url: null,
    status: 'active',
    created_at: iso(300),
    shopDomain: null,
    ...c,
  });
  const campaigns = [
    campaign({ id: 'cmp-zero', brand_id: DEMO_BRAND_ID, title: 'Voltline Zero — Launch Week', payout_model: 'hybrid', base_payout: 500, cpm_rate: 4, cpm_cap: 5000, code_prefix: 'VOLT', escrow_balance: 31_000, shopDomain: 'voltline.myshopify.com', created_at: iso(500) }),
    campaign({ id: 'cmp-snack', brand_id: DEMO_BRAND_ID, title: 'Stream Snack Bundle', payout_model: 'cps_performance', cps_commission_pct: 15, cpm_cap: 3000, code_prefix: 'SNACK', escrow_balance: 12_000, shopDomain: 'voltline.myshopify.com', created_at: iso(200) }),
    campaign({ id: 'cmp-latenight', brand_id: DEMO_BRAND_ID, title: 'Late Night Gaming Clips', payout_model: 'pure_cpm', cpm_rate: 2.5, cpm_cap: 1500, code_prefix: 'NIGHT', status: 'draft', created_at: iso(10) }),
    campaign({ id: 'cmp-desk', brand_id: 'b-pixelforge', title: 'Desk Setup Tour', payout_model: 'pure_cpm', cpm_rate: 3, cpm_cap: 2000, code_prefix: 'FORGE', escrow_balance: 18_000, shopDomain: 'pixelforge.myshopify.com' }),
    campaign({ id: 'cmp-irl', brand_id: 'b-ridgeline', title: 'IRL Stream Gear', payout_model: 'hybrid', base_payout: 250, cpm_rate: 2, cpm_cap: 1500, code_prefix: 'RIDGE', escrow_balance: 9_500, shopDomain: 'ridgeline.myshopify.com' }),
    campaign({ id: 'cmp-coffee', brand_id: 'b-northwind', title: 'Morning Stream Coffee', payout_model: 'cps_performance', cps_commission_pct: 12, cpm_cap: 1200, code_prefix: 'BREW', escrow_balance: 6_000, shopDomain: 'northwind.myshopify.com' }),
  ];

  const enrollments: Enrollment[] = [];
  const enroll = (creatorId: string, campaignId: string, code: string) => {
    const e = { id: `en-${creatorId}-${campaignId}`, campaign_id: campaignId, creator_id: creatorId, ref_param: refParam(creatorId, campaignId), discount_code: code };
    enrollments.push(e);
    return e;
  };

  let vid = 7_310_000_000_000_000_000n;
  const submissions: DemoSubmission[] = [];
  const submit = (creatorId: string, campaignId: string, views: number, commentRate: number, s: Partial<Submission> = {}) => {
    vid += 7_919_133n;
    const comments = Math.round(views * commentRate);
    submissions.push({
      id: `sub-${creatorId}-${campaignId}`,
      campaign_id: campaignId,
      creator_id: creatorId,
      platform: 'tiktok',
      video_url: `https://www.tiktok.com/video/${vid}`,
      social_platform_video_id: String(vid),
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
      last_synced_at: iso(1.2),
      created_at: iso(120),
      prevSample: { at: Date.now() - 1.2 * HOUR, views, comments },
      ...s,
    });
  };

  // Voltline Zero — hybrid
  enroll('cr-kaicenat', 'cmp-zero', 'VOLTK41C');
  enroll('cr-ishowspeed', 'cmp-zero', 'VOLTSP3D');
  enroll('cr-pokimane', 'cmp-zero', 'VOLTP0K1');
  enroll('cr-ludwig', 'cmp-zero', 'VOLTLDW9');
  enroll('cr-clipfarm247', 'cmp-zero', 'VOLTCF24');
  submit('cr-kaicenat', 'cmp-zero', 1_120_000, 0.014, { payout_transferred: 3000 });
  submit('cr-ishowspeed', 'cmp-zero', 2_310_000, 0.017, { payout_transferred: 5000, status: 'paid' });
  submit('cr-pokimane', 'cmp-zero', 612_400, 0.011);
  submit('cr-ludwig', 'cmp-zero', 298_700, 0.013, { status: 'pending_review' });
  submit('cr-clipfarm247', 'cmp-zero', 486_000, 0.00008, {
    status: 'flagged',
    fraud_score: 90,
    flag_reason: 'Bot farm activity: 3,120 views/min, 0.008% comment ratio',
  });

  // Stream Snack Bundle — cost per sale
  enroll('cr-valkyrae', 'cmp-snack', 'SNACKV4L');
  enroll('cr-xqc', 'cmp-snack', 'SNACKX9C');
  enroll('cr-kaicenat', 'cmp-snack', 'SNACKK2T');
  enroll('cr-reuploadking', 'cmp-snack', 'SNACKR7P');
  submit('cr-valkyrae', 'cmp-snack', 402_300, 0.012);
  submit('cr-xqc', 'cmp-snack', 377_900, 0.019);
  submit('cr-reuploadking', 'cmp-snack', 22_400, 0.004, {
    status: 'flagged',
    fraud_score: 100,
    flag_reason: 'Duplicate content: >95% match with another submission',
  });

  // Other brands' campaigns (creator side)
  enroll('cr-kaicenat', 'cmp-desk', 'FORGEK8N');
  submit('cr-kaicenat', 'cmp-desk', 233_000, 0.012);

  const conversions: Conversion[] = [];
  const sales = (creatorId: string, campaignId: string, count: number, avg: number) => {
    const e = enrollments.find((x) => x.creator_id === creatorId && x.campaign_id === campaignId)!;
    for (let i = 0; i < count; i++) conversions.push({ campaignId, enrollmentId: e.id, total: cents(avg * (0.7 + ((i * 37) % 60) / 100)) });
  };
  sales('cr-kaicenat', 'cmp-zero', 318, 34);
  sales('cr-ishowspeed', 'cmp-zero', 452, 31);
  sales('cr-pokimane', 'cmp-zero', 141, 38);
  sales('cr-ludwig', 'cmp-zero', 27, 33);
  sales('cr-valkyrae', 'cmp-snack', 214, 46);
  sales('cr-xqc', 'cmp-snack', 166, 41);
  sales('cr-kaicenat', 'cmp-desk', 58, 89);

  const state: State = { brands, creators, campaigns, enrollments, submissions, conversions, ledger: [] };

  // Derive counters and earnings with the real payout function.
  for (const s of submissions) {
    const enrollment = enrollments.find((e) => e.creator_id === s.creator_id && e.campaign_id === s.campaign_id)!;
    s.current_conversions = conversions.filter((c) => c.enrollmentId === enrollment.id).length;
    if (s.status === 'pending_review') continue;
    const c = campaigns.find((x) => x.id === s.campaign_id)!;
    s.payout_earned = calculatePayout(c, s.current_view_count, revenueFor(state, enrollment.id));
    if (s.status === 'flagged') s.payout_earned = cents(s.payout_earned * 0.35); // accrual froze earlier
  }

  // Ledger: deposits cover current escrow plus everything already paid; payouts split with the fee.
  for (const c of campaigns) {
    const paid = submissions.filter((s) => s.campaign_id === c.id).reduce((a, s) => a + s.payout_transferred, 0);
    if (c.escrow_balance + paid > 0) state.ledger.push({ campaignId: c.id, type: 'deposit', amount: c.escrow_balance + paid });
    for (const s of submissions.filter((x) => x.campaign_id === c.id && x.payout_transferred > 0)) {
      const { net, fee } = splitFee(s.payout_transferred, platformFeePercent());
      state.ledger.push({ campaignId: c.id, type: 'creator_payout', amount: net }, { campaignId: c.id, type: 'platform_fee', amount: fee });
    }
  }
  return state;
}

const g = globalThis as unknown as { __creatorEngineDemo?: State };
const db = () => (g.__creatorEngineDemo ??= seed());

export function resetDemo() {
  g.__creatorEngineDemo = seed();
}

function revenueFor(s: State, enrollmentId: string) {
  return s.conversions.filter((c) => c.enrollmentId === enrollmentId).reduce((a, c) => a + c.total, 0);
}
const enrollmentOf = (s: State, sub: Submission) => s.enrollments.find((e) => e.creator_id === sub.creator_id && e.campaign_id === sub.campaign_id)!;
const strip = ({ shopDomain: _s, ...c }: DemoCampaign): Campaign => c;
const stripSub = ({ prevSample: _p, ...s }: DemoSubmission): Submission => s;

// ─── Viewer ────────────────────────────────────────────────────────────────
export function currentCreatorId(): string {
  const id = cookies().get(CREATOR_COOKIE)?.value;
  return id && db().creators.some((c) => c.id === id) ? id : DEFAULT_CREATOR;
}
export function setCurrentCreator(id: string) {
  if (db().creators.some((c) => c.id === id)) cookies().set(CREATOR_COOKIE, id, { path: '/', sameSite: 'lax' });
}
export const demoCreators = () => db().creators.filter((c) => !c.handle.includes('.')).map((c) => ({ id: c.id, name: c.displayName }));

// ─── Queries ───────────────────────────────────────────────────────────────
export function brandDashboard(): BrandDashboard {
  const s = db();
  return {
    brandName: s.brands.find((b) => b.id === DEMO_BRAND_ID)!.name,
    campaigns: s.campaigns
      .filter((c) => c.brand_id === DEMO_BRAND_ID)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => {
        const own = s.submissions.filter((x) => x.campaign_id === c.id);
        return {
          ...strip(c),
          submissions: own.length,
          views: own.reduce((a, x) => a + x.current_view_count, 0),
          conversions: own.reduce((a, x) => a + x.current_conversions, 0),
          earned: own.reduce((a, x) => a + x.payout_earned, 0),
        };
      }),
  };
}

export function campaignDetail(id: string): CampaignDetail | null {
  const s = db();
  const c = s.campaigns.find((x) => x.id === id && x.brand_id === DEMO_BRAND_ID);
  if (!c) return null;
  const sum = (type: Ledger['type']) => cents(s.ledger.filter((l) => l.campaignId === id && l.type === type).reduce((a, l) => a + l.amount, 0));
  return {
    campaign: strip(c),
    shopDomain: c.shopDomain,
    submissions: s.submissions
      .filter((x) => x.campaign_id === id)
      .sort((a, b) => b.current_view_count - a.current_view_count)
      .map((x): SubmissionRow => ({ ...stripSub(x), creator_name: '@' + s.creators.find((cr) => cr.id === x.creator_id)!.handle })),
    deposited: sum('deposit'),
    paidOut: sum('creator_payout'),
    fees: sum('platform_fee'),
  };
}

export function creatorDashboard(): CreatorDashboard {
  const s = db();
  const me = s.creators.find((c) => c.id === currentCreatorId())!;
  const mine = s.enrollments.filter((e) => e.creator_id === me.id);
  const brandName = (id: string) => s.brands.find((b) => b.id === id)?.name ?? '';
  return {
    name: me.displayName,
    tiktok: me.tiktokConnected ? { username: me.handle, followers: me.followers } : null,
    payoutsEnabled: me.payoutsEnabled,
    enrollments: mine.map((e) => {
      const c = s.campaigns.find((x) => x.id === e.campaign_id)!;
      const sub = s.submissions.find((x) => x.creator_id === me.id && x.campaign_id === c.id);
      return { enrollment: e, campaign: strip(c), brandName: brandName(c.brand_id), shopDomain: c.shopDomain, submission: sub ? stripSub(sub) : null };
    }),
    openCampaigns: s.campaigns
      .filter((c) => c.status === 'active' && !mine.some((e) => e.campaign_id === c.id))
      .map((c) => ({ ...strip(c), brandName: brandName(c.brand_id) })),
  };
}

// ─── Brand actions ─────────────────────────────────────────────────────────
const ownCampaign = (id: string) => db().campaigns.find((c) => c.id === id && c.brand_id === DEMO_BRAND_ID);

export function createCampaign(input: Omit<Campaign, 'id' | 'brand_id' | 'escrow_balance' | 'pixel_id' | 'status' | 'created_at'>): string {
  const id = `cmp-${randomUUID().slice(0, 8)}`;
  db().campaigns.push({ ...input, id, brand_id: DEMO_BRAND_ID, escrow_balance: 0, pixel_id: null, status: 'draft', created_at: new Date().toISOString(), shopDomain: null });
  return id;
}

export function setCampaignStatus(id: string, status: Campaign['status']): ActionState {
  const c = ownCampaign(id);
  if (!c) return { error: 'Campaign not found.' };
  if (status === 'active' && c.escrow_balance <= 0) return { error: 'Fund escrow before going live.' };
  c.status = status;
  return { success: `Campaign ${status}.` };
}

export function fundEscrow(id: string, amount: number): ActionState {
  const c = ownCampaign(id);
  if (!c) return { error: 'Campaign not found.' };
  c.escrow_balance = cents(c.escrow_balance + amount);
  db().ledger.push({ campaignId: id, type: 'deposit', amount });
  return { success: `Mock deposit of $${amount.toLocaleString('en-US')} added to escrow.` };
}

export function connectStore(id: string, domain: string): ActionState {
  const c = ownCampaign(id);
  if (!c) return { error: 'Campaign not found.' };
  c.shopDomain = domain;
  return { success: 'Store connected (mock).' };
}

export function reviewSubmission(id: string, decision: 'approve' | 'flag'): ActionState {
  const s = db();
  const sub = s.submissions.find((x) => x.id === id);
  if (!sub || !ownCampaign(sub.campaign_id)) return { error: 'Submission not found.' };
  if (decision === 'approve') {
    Object.assign(sub, { status: 'live_tracking', flag_reason: null, fraud_score: 0 });
    const c = ownCampaign(sub.campaign_id)!;
    sub.payout_earned = Math.max(sub.payout_earned, calculatePayout(c, sub.current_view_count, revenueFor(s, enrollmentOf(s, sub).id)));
    return { success: 'Approved — tracking started.' };
  }
  Object.assign(sub, { status: 'flagged', flag_reason: 'Flagged by brand review' });
  return { success: 'Flagged.' };
}

export function releasePayout(id: string): ActionState {
  const s = db();
  const sub = s.submissions.find((x) => x.id === id);
  const c = sub && ownCampaign(sub.campaign_id);
  if (!sub || !c) return { error: 'Submission not found.' };
  const creator = s.creators.find((x) => x.id === sub.creator_id)!;
  if (sub.status !== 'live_tracking') return { error: 'Only approved, unflagged submissions can be paid.' };
  if (!creator.payoutsEnabled) return { error: `@${creator.handle} has not finished payout setup.` };
  const gross = cents(sub.payout_earned - sub.payout_transferred);
  if (gross < 1) return { error: 'Nothing to pay out yet.' };
  if (c.escrow_balance < gross) return { error: 'Not enough escrow — top up the campaign first.' };

  const { net, fee } = splitFee(gross, platformFeePercent());
  c.escrow_balance = cents(c.escrow_balance - gross);
  sub.payout_transferred = cents(sub.payout_transferred + gross);
  s.ledger.push({ campaignId: c.id, type: 'creator_payout', amount: net }, { campaignId: c.id, type: 'platform_fee', amount: fee });
  if (sub.payout_transferred >= c.cpm_cap) sub.status = 'paid';
  return { success: `Paid $${net.toFixed(2)} to @${creator.handle} ($${fee.toFixed(2)} fee) — mock money.` };
}

/** One simulated 4-hour sync: views grow, the real velocity watchdog and payout formula run. */
export function simulateSync(campaignId: string): ActionState {
  const s = db();
  const c = ownCampaign(campaignId);
  if (!c) return { error: 'Campaign not found.' };
  const subs = s.submissions.filter((x) => x.campaign_id === campaignId && (x.status === 'live_tracking' || x.status === 'pending_review'));
  if (!subs.length) return { error: 'No live videos to sync.' };

  const now = Date.now();
  let flagged = 0;
  for (const sub of subs) {
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
  return { success: `Synced ${subs.length} videos${flagged ? `, ${flagged} flagged` : ''}.` };
}

/** A storefront order arrives with one creator's code or ref link. */
export function simulateSale(campaignId: string): ActionState {
  const s = db();
  const c = ownCampaign(campaignId);
  if (!c) return { error: 'Campaign not found.' };
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
  return { success: `$${total.toFixed(2)} order via code ${enrollment.discount_code} → @${handle}.` };
}

// ─── Creator actions ───────────────────────────────────────────────────────
export function joinCampaign(campaignId: string): ActionState {
  const s = db();
  const me = currentCreatorId();
  const c = s.campaigns.find((x) => x.id === campaignId);
  if (!c || c.status !== 'active') return { error: 'This campaign is not accepting creators.' };
  if (s.enrollments.some((e) => e.creator_id === me && e.campaign_id === campaignId)) return { error: 'You already joined this campaign.' };
  s.enrollments.push({ id: `en-${randomUUID().slice(0, 8)}`, campaign_id: campaignId, creator_id: me, ref_param: refParam(me, campaignId), discount_code: generateDiscountCode(c.code_prefix) });
  return { success: 'Joined — your code and tracking link are ready.' };
}

export function submitVideo(campaignId: string, url: string): ActionState {
  const s = db();
  const me = s.creators.find((c) => c.id === currentCreatorId())!;
  if (!s.enrollments.some((e) => e.creator_id === me.id && e.campaign_id === campaignId)) return { error: 'Join the campaign before submitting.' };
  if (!me.tiktokConnected) return { error: 'Connect your TikTok account first.' };

  const parsed = parseVideoUrl(url);
  if (!parsed.ok) {
    if (parsed.reason === 'needs_resolution') return { error: 'In demo mode, paste the full tiktok.com/@user/video/… link.' };
    return { error: parsed.reason === 'unsupported_host' ? 'Only TikTok, Instagram Reels and YouTube Shorts links are recognised.' : 'That link does not point to a single video.' };
  }
  if (parsed.video.platform !== 'tiktok') return { error: 'Instagram and YouTube tracking is not live yet — submit a TikTok video.' };
  if (s.submissions.some((x) => x.creator_id === me.id && x.campaign_id === campaignId)) return { error: 'You already have a submission in this campaign.' };
  if (s.submissions.some((x) => x.campaign_id === campaignId && x.social_platform_video_id === parsed.video.videoId)) {
    return { error: 'This video was already submitted to this campaign.' };
  }

  // Mock "TikTok API" response: early views scale with follower count.
  const views = Math.round(me.followers * (0.004 + Math.random() * 0.01));
  const comments = Math.round(views * (0.008 + Math.random() * 0.008));
  const now = Date.now();
  s.submissions.push({
    id: `sub-${randomUUID().slice(0, 8)}`,
    campaign_id: campaignId,
    creator_id: me.id,
    platform: 'tiktok',
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
    last_synced_at: new Date(now).toISOString(),
    created_at: new Date(now).toISOString(),
    prevSample: { at: now, views, comments },
  });
  return { success: 'Submitted — the brand will review it shortly.' };
}

export function connectTikTok(): void {
  const me = db().creators.find((c) => c.id === currentCreatorId())!;
  me.tiktokConnected = true;
}

export function enablePayouts(): void {
  const me = db().creators.find((c) => c.id === currentCreatorId())!;
  me.payoutsEnabled = true;
}
