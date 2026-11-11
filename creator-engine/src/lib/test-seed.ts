/* eslint-disable @typescript-eslint/no-explicit-any */
// Fake test data for trying every screen: 17 businesses, 320 clippers (6 Majesty),
// ~85 campaigns in every pay model and state, ~5,000 clips, money records, view history,
// invites, moments and tickets. Every account is an @atlas.test email and every clip's
// video id starts with TEST_VIDEO_PREFIX, so the sync and payouts skip them and
// removeTestData() deletes the lot. Run from the admin page (or /dev/accounts locally).
import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, any>;

export const TEST_PASSWORD = 'atlas-test-123';
const PASSWORD = TEST_PASSWORD;

// ── deterministic randomness ──
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const int = (a: number, b: number): number => Math.floor(a + rnd() * (b - a + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const some = <T,>(arr: readonly T[], n: number): T[] => [...arr].sort(() => rnd() - 0.5).slice(0, n);
const HOUR = 3_600_000;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const cents = (n: number) => Math.floor(n * 100 + 1e-6) / 100;
const uid = () => crypto.randomUUID();
const code = (n = 8): string => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[int(0, 31)]).join('');
// The prefix marks test clips: the live sync and payouts skip them (src/lib/test-data.ts).
const vid = () => 'atlastest' + Array.from({ length: 12 }, () => int(0, 9)).join('');

async function insert(db: SupabaseClient, table: string, all: Row[], size = 500) {
  // Rows in one request must share the same columns, or missing ones become NULL.
  const groups = new Map();
  for (const r of all) {
    const k = Object.keys(r).sort().join(',');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const rows of groups.values())
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function user(db: SupabaseClient, email: string) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

const TOPICS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Movies & TV', 'Brands & products', 'Podcasts'];
const CATS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Other'];
const TYPES = ['clipping', 'ugc_face', 'ugc_faceless', 'slideshow', 'logo', 'sound', 'reposting'];
const PLATS = ['tiktok', 'youtube', 'instagram'];
const TIER_FEE: Record<string, number> = { silver: 9, gold: 8.5, platinum: 8, diamond: 6, majesty: 4 };

// ── people ──
const FIRST = ['Nova', 'Kai', 'Zara', 'Leo', 'Maya', 'Rio', 'Ezra', 'Luna', 'Jax', 'Iris', 'Milo', 'Sky', 'Remy', 'Ada', 'Finn', 'Nia', 'Theo', 'Ivy', 'Cruz', 'Lola', 'Ash', 'Juno', 'Rex', 'Cleo', 'Ozzy', 'Pia', 'Dex', 'Mira', 'Vik', 'Tess', 'Bo', 'Eli', 'Gia', 'Hugo', 'Kira', 'Nico', 'Ola', 'Ravi', 'Suki', 'Uma'];
const STYLE = ['clips', 'cuts', 'edits', 'highlights', 'moments', 'shorts', 'reels', 'vault', 'lab', 'studio'];
const clipperName = (i: number) => `${FIRST[i % FIRST.length]}${i >= FIRST.length ? ' ' + STYLE[Math.floor(i / FIRST.length) % STYLE.length] : ' Clips'}${i >= FIRST.length * STYLE.length ? ' ' + i : ''}`;
const handleOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '');

const BRAND_NAMES = ['Kaicenat Clips Co', 'Pixel Forge Games', 'Harbor Records', 'Lumen Studios', 'Brightline Energy', 'Atlas Esports', 'Moonlight Podcast', 'Velvet Sound', 'Neon Arcade', 'Summit Sports', 'Orbit Apps', 'Fable Films', 'Riverside Comedy', 'Bytewise Academy'];
const BRAND_KIND = (i: number) => (i % 4 === 1 ? 'agency' : 'streamer');

const CAMPAIGN_TITLES: Record<string, string[]> = {
  Gaming: ['Ranked grind highlights', 'Clutch moments from my streams', 'New season launch clips', 'Speedrun best bits', 'Horror game jumpscares', 'Minecraft hardcore series'],
  IRL: ['IRL Tokyo trip', 'City walk funny moments', 'Road trip vlog cuts', 'Festival weekend IRL'],
  'Just Chatting': ['Hot takes from chatting streams', 'Reaction stream highlights', 'Q&A best answers', 'Late night chatting clips'],
  Esports: ['Grand final highlights', 'Pro player POV clips', 'Tournament week recap'],
  Music: ['New single: 15s hook', 'Album launch sound campaign', 'Live session cuts', 'Remix contest clips'],
  Sports: ['Match day reactions', 'Training camp clips', 'Fight night highlights'],
  Comedy: ['Stand-up special clips', 'Sketch show cuts', 'Prank series highlights'],
  Education: ['Study tips shorts', 'Money explained clips', 'Coding in 60 seconds'],
  Other: ['App launch UGC', 'Film trailer cuts', 'Product review UGC', 'Energy drink launch'],
};
const RULES = ['Credit my channel on screen', 'Vertical 9:16 with captions', 'Hook in the first 2 seconds', 'Under 60 seconds', 'No reuploads of other clippers', 'Use the trending sound', 'Add #ad where required'];

/** Creates the whole test data set. Takes a minute or two. */
export async function seedTestData(db: SupabaseClient): Promise<string> {
  // Main test logins.
  const accounts = {
    streamer: await user(db, 'streamer@atlas.test'),
    agency: await user(db, 'agency@atlas.test'),
    newbrand: await user(db, 'newbrand@atlas.test'),
    clipper: await user(db, 'clipper@atlas.test'),
    majesty: await user(db, 'majesty@atlas.test'),
    newclipper: await user(db, 'newclipper@atlas.test'),
  };

  // ── brands ──
  const brands: Row[] = [
    { id: uid(), owner_id: accounts.streamer, name: 'Nova Plays', kind: 'streamer', verified: true, early_partner: true, interests: ['Gaming', 'Just Chatting', 'goal:More views'], heard_from: 'TikTok', onboarded_at: ago(900), created_at: ago(2400) },
    { id: uid(), owner_id: accounts.agency, name: 'Peak Agency', kind: 'agency', verified: true, early_partner: true, interests: ['Music', 'Brands & products'], heard_from: 'A friend', onboarded_at: ago(800), created_at: ago(2000) },
    { id: uid(), owner_id: accounts.newbrand, name: 'Fresh Brand', kind: 'streamer', early_partner: true, created_at: ago(1) },
  ];
  for (let i = 0; i < BRAND_NAMES.length; i++) {
    brands.push({ id: uid(), owner_id: await user(db, `brand${i + 1}@atlas.test`), name: BRAND_NAMES[i], kind: BRAND_KIND(i), verified: i % 3 === 0, early_partner: true, interests: [pick(TOPICS)], onboarded_at: ago(500), created_at: ago(int(300, 3000)) });
  }
  await insert(db, 'brands', brands);
  const [mainBrand, agencyBrand] = brands;
  const otherBrands = brands.slice(3);

  // ── clippers (320) ──
  const N = 320;
  const creators: Row[] = [];
  const tierPlan = (i: number) => (i < 6 ? 'majesty' : i < 21 ? 'diamond' : i < 51 ? 'platinum' : i < 121 ? 'gold' : 'silver');
  for (let i = 0; i < N; i++) {
    const special = i === 0 ? 'majesty' : i === 30 ? 'clipper' : null; // majesty@ is a Majesty, clipper@ a Platinum
    const name = i === 0 ? 'Majesty Max' : i === 30 ? 'Diggy' : clipperName(i);
    const userId = special ? accounts[special] : await user(db, `clipper${i + 1}@atlas.test`);
    const posts = some(['post:TikTok', 'post:YouTube Shorts', 'post:Instagram Reels'], int(1, 3));
    creators.push({
      id: uid(),
      user_id: userId,
      display_name: name,
      payouts_enabled: true,
      stripe_account_id: `acct_test_${code(10)}`,
      bio: rnd() < 0.6 ? pick(['Gaming clipper. Fast turnarounds.', 'I cut viral moments every day.', 'Editor, 3 years of shorts.', 'Music and sound campaigns.', 'Captions + hooks that hold.', 'Full-time clipper, all niches.']) : null,
      verified: i < 6 || (i < 21 && i % 3 === 0),
      interests: [...some(TOPICS, int(1, 3)), ...posts],
      heard_from: pick(['TikTok', 'YouTube', 'Discord', 'A friend', 'Google', 'Instagram']),
      onboarded_at: ago(int(10, 2000)),
      created_at: ago(int(24, 3000)),
      _tier: tierPlan(i),
      _handle: handleOf(name) + (i ? i : ''),
    });
  }
  creators.push({ id: uid(), user_id: accounts.newclipper, display_name: 'New Clipper', payouts_enabled: false, interests: [], created_at: ago(1), _tier: 'none', _handle: 'newclipper' });
  await insert(db, 'creators', creators.map(({ _tier, _handle, ...c }) => c));
  const mainClipper = creators[30];
  const majestyClipper = creators[0];

  await insert(db, 'social_accounts', creators.filter((c) => c._tier !== 'none').flatMap((c) =>
    some(PLATS, int(1, 3)).map((p) => ({ creator_id: c.id, platform: p, platform_user_id: `${p}_${code(10)}`, username: p === 'youtube' ? c.display_name : c._handle, follower_count: c._tier === 'majesty' ? int(400_000, 2_000_000) : c._tier === 'diamond' ? int(80_000, 400_000) : int(300, 60_000) })),
  ));
  await insert(db, 'payout_methods', creators.filter((c) => c._tier !== 'none').map((c) => ({ creator_id: c.id, method: 'stripe' })));

  // ── campaigns ──
  const campaigns: Row[] = [];
  const makeCampaign = (brand: Row, n: number, opts: Row = {}): Row => {
    const category = opts.category ?? pick(CATS);
    const model = opts.model ?? pick(['pure_cpm', 'pure_cpm', 'pure_cpm', 'per_post', 'pool']);
    const rate = pick([0.5, 0.75, 1, 1, 1, 1.25, 1.5, 2, 2.5, 3]);
    const platforms = opts.platforms ?? some(PLATS, int(1, 3));
    const perPlatform = model === 'pure_cpm' && rnd() < 0.3;
    const title = opts.title ?? `${pick(CAMPAIGN_TITLES[category])}${n > 0 ? ` #${n}` : ''}`;
    return {
      id: uid(),
      brand_id: brand.id,
      title,
      payout_model: model,
      escrow_balance: 0,
      base_payout: model === 'per_post' ? pick([5, 8, 10, 15, 20, 25, 40]) : 0,
      cpm_rate: model === 'pure_cpm' ? rate : 0,
      cpm_cap: model === 'per_post' ? 40 : pick([50, 100, 150, 250, 500, 1000]),
      code_prefix: code(5),
      status: opts.status ?? 'active',
      created_at: ago(opts.ageHours ?? int(24, 1500)),
      thumbnail_url: `https://picsum.photos/seed/${code(6)}/800/450`,
      cover_color: '#18181b',
      brief: `Cut the best moments into short vertical clips. Keep it punchy and on brand. ${category} audience.`,
      requirements: some(RULES, int(2, 4)),
      platforms,
      content_types: some(TYPES, int(1, 3)),
      category,
      min_payout: rnd() < 0.2 ? pick([1, 2, 5]) : 0,
      moments_enabled: opts.moments ?? rnd() < 0.25,
      platform_rates: perPlatform ? Object.fromEntries(platforms.map((p: string) => [p, cents(rate * pick([0.8, 1, 1.25, 1.5]))])) : {},
      max_clips_per_clipper: rnd() < 0.2 ? pick([1, 3, 5, 10]) : null,
      client_name: opts.client ?? null,
      min_tier: opts.minTier ?? (rnd() < 0.12 ? pick(['gold', 'platinum', 'diamond']) : 'silver'),
      invite_only: opts.inviteOnly ?? false,
      _budgetFactor: opts.budgetFactor ?? (rnd() < 0.2 ? 1.08 : 1.4 + rnd() * 2),
    };
  };
  // Main streamer: 44 campaigns covering every model and state.
  const plan: Row[] = [
    ...Array.from({ length: 14 }, () => ({ model: 'pure_cpm' })),
    ...Array.from({ length: 8 }, () => ({ model: 'per_post' })),
    ...Array.from({ length: 8 }, () => ({ model: 'pool' })),
    { model: 'pure_cpm', inviteOnly: true, title: 'Private: VIP clippers only' },
    { model: 'pool', inviteOnly: true, title: 'Invite only: Grand final pool' },
    { model: 'pure_cpm', minTier: 'majesty', title: 'Majesty only: Big launch' },
    { model: 'pure_cpm', minTier: 'diamond', title: 'Diamond+ highlights' },
    { model: 'pure_cpm', moments: true, title: 'Marathon stream: pinned moments' },
    { model: 'pure_cpm', status: 'paused', title: 'Paused: old season clips' },
    { model: 'per_post', status: 'paused' },
    { model: 'pure_cpm', status: 'completed', ageHours: 1400 },
    { model: 'pool', status: 'completed', ageHours: 1200, title: 'Ended pool: Summer finale' },
    { model: 'per_post', status: 'completed', ageHours: 1300 },
    { model: 'pure_cpm', status: 'draft', ageHours: 5, title: 'Draft: no budget yet', budgetFactor: 0 },
    { model: 'pure_cpm', status: 'draft', ageHours: 3, title: 'Draft: funded, ready to launch', noSubs: true },
    { model: 'pure_cpm', status: 'draft', ageHours: 2, inviteOnly: true, title: 'Draft: invite only, needs invites', noSubs: true },
  ];
  plan.forEach((p, i) => campaigns.push({ ...makeCampaign(mainBrand, i + 1, p), _noSubs: p.noSubs || p.budgetFactor === 0, _main: true }));
  // Agency: campaigns for named clients.
  ['Harbor Records', 'Orbit Apps', 'Fable Films', 'Brightline Energy', 'Velvet Sound', 'Neon Arcade', 'Lumen Studios', 'Summit Sports'].forEach((client, i) =>
    campaigns.push({ ...makeCampaign(agencyBrand, 0, { client, status: i === 7 ? 'draft' : 'active' }), _noSubs: i === 7 }),
  );
  // Everyone else: 2–3 each, so Discover is full.
  for (const b of otherBrands) for (let k = 0; k < int(2, 3); k++) campaigns.push(makeCampaign(b, 0, { status: rnd() < 0.85 ? 'active' : pick(['paused', 'completed']) }));
  const subsTarget = campaigns.filter((c) => !c._noSubs && c.status !== 'draft');

  // ── submissions ──
  const TIER_SPEC: Record<string, { clips: [number, number]; views: [number, number]; flagged: number; pending: [number, number] }> = {
    majesty: { clips: [130, 165], views: [11_000_000, 30_000_000], flagged: 0, pending: [3, 6] },
    diamond: { clips: [55, 80], views: [2_800_000, 8_000_000], flagged: 3, pending: [2, 5] },
    platinum: { clips: [22, 40], views: [300_000, 2_000_000], flagged: 2, pending: [1, 4] },
    gold: { clips: [9, 18], views: [60_000, 240_000], flagged: 1, pending: [0, 3] },
    silver: { clips: [0, 6], views: [0, 40_000], flagged: 1, pending: [0, 2] },
  };
  const enroll = new Map(); // `${camp}:${creator}`
  const enrollments: Row[] = [];
  const subs: Row[] = [];
  const join = (c: Row, cr: Row, at: string) => {
    const k = `${c.id}:${cr.id}`;
    if (enroll.has(k)) return;
    enroll.set(k, true);
    enrollments.push({ campaign_id: c.id, creator_id: cr.id, ref_param: `r${code(10)}`, discount_code: `${c.code_prefix}${code(5)}`, joined_at: at });
  };
  const live = subsTarget.filter((c) => c.status === 'active');
  const mainLive = live.filter((c) => c._main);
  const addSub = (cr: Row, c: Row, status: string, views: number, ageH: number) => {
    const platform = pick(c.platforms);
    join(c, cr, ago(ageH + int(1, 48)));
    const id = vid();
    const url = platform === 'tiktok' ? `https://www.tiktok.com/@${cr._handle}/video/${id}` : platform === 'youtube' ? `https://www.youtube.com/shorts/${id}` : `https://www.instagram.com/reel/${id}/`;
    subs.push({
      id: uid(),
      campaign_id: c.id,
      creator_id: cr.id,
      platform,
      video_url: url,
      social_platform_video_id: id,
      current_view_count: views,
      current_like_count: Math.round(views * (0.04 + rnd() * 0.06)),
      current_comment_count: Math.round(views * (0.002 + rnd() * 0.006)),
      status,
      fraud_score: status === 'flagged' && rnd() < 0.3 ? int(70, 95) : int(0, 20),
      flag_reason: status === 'flagged' ? pick(['Missing credit on screen', 'Reupload of another clipper', 'Bot-like view spike']) : null,
      approved_at: status === 'pending_review' ? null : ago(Math.max(1, ageH - int(1, 24))),
      created_at: ago(ageH),
      last_synced_at: ago(int(1, 4)),
      has_disclosure: true,
      engagement_cleared: true,
      cover_url: `https://picsum.photos/seed/${id.slice(-8)}/360/640`,
      payout_earned: 0,
      payout_transferred: 0,
      _tier: cr._tier,
    });
  };
  for (const cr of creators) {
    if (cr._tier === 'none') continue;
    const spec = TIER_SPEC[cr._tier];
    const approved = cr === mainClipper ? 30 : int(...spec.clips);
    const totalViews = int(...spec.views);
    // Spread views: a few clips go big, most are modest.
    const weights = Array.from({ length: approved }, () => Math.pow(rnd(), 3) + 0.02);
    const wsum = weights.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < approved; k++) {
      const c = rnd() < 0.35 && mainLive.length ? pick(mainLive) : pick(subsTarget);
      addSub(cr, c, 'live_tracking', Math.round((totalViews * weights[k]) / wsum), int(30, 2000));
    }
    const flagged = spec.flagged ? int(0, spec.flagged) : 0;
    for (let k = 0; k < flagged; k++) addSub(cr, pick(subsTarget), 'flagged', int(200, 20_000), int(48, 1500));
    // Waiting for review, mostly on the main streamer's campaigns.
    const pending = cr === majestyClipper ? 6 : int(...spec.pending);
    for (let k = 0; k < pending; k++) addSub(cr, rnd() < 0.7 && mainLive.length ? pick(mainLive) : pick(live), 'pending_review', int(500, cr._tier === 'majesty' ? 900_000 : 120_000), int(1, 70));
  }
  // The main clipper has also joined a few campaigns without posting yet.
  for (const c of some(live, 4)) join(c, mainClipper, ago(int(5, 100)));
  // Some joined clippers with no clips yet on main campaigns.
  for (const c of mainLive) for (const cr of some(creators.slice(121, 320), int(2, 8))) join(c, cr, ago(int(2, 200)));

  // ── money: earnings, budgets, payouts ──
  const byCamp = new Map(campaigns.map((c) => [c.id, c]));
  const HOLD: Record<string, number> = { silver: 72, gold: 60, platinum: 48, diamond: 24, majesty: 12 };
  for (const s of subs) {
    const c = byCamp.get(s.campaign_id)!;
    if (s.status !== 'live_tracking' || c.payout_model === 'pool') continue;
    let earned = c.payout_model === 'per_post' ? c.base_payout : (s.current_view_count / 1000) * (Number(c.platform_rates?.[s.platform]) || c.cpm_rate);
    if (earned < c.min_payout) earned = 0;
    s.payout_earned = cents(Math.min(earned, c.cpm_cap));
  }
  const ledger: Row[] = [];
  for (const c of campaigns) {
    const cs = subs.filter((s) => s.campaign_id === c.id);
    const earned = cs.reduce((n, s) => n + s.payout_earned, 0);
    const pendingGuess = cs.filter((s) => s.status === 'pending_review').length * (c.payout_model === 'per_post' ? c.base_payout : 20);
    let deposit = c._budgetFactor === 0 ? 0 : Math.ceil(((earned + pendingGuess) * c._budgetFactor + (c.payout_model === 'pool' ? int(500, 4000) : int(200, 1500))) / 50) * 50;
    if (c._noSubs && c._budgetFactor !== 0) deposit = int(10, 60) * 100;
    if (c.payout_model === 'pool') {
      // The pool is the whole budget, shared by views.
      const elig = cs.filter((s) => s.status === 'live_tracking');
      const total = elig.reduce((n, s) => n + s.current_view_count, 0) || 1;
      for (const s of elig) s.payout_earned = cents((deposit * s.current_view_count) / total);
    }
    // Paid out: older approved clips past their hold (pools only once ended).
    let transferred = 0;
    for (const s of cs) {
      if (s.status !== 'live_tracking' || s.payout_earned <= 0) continue;
      if (c.payout_model === 'pool' && c.status !== 'completed') continue;
      const age = (Date.now() - new Date(s.approved_at).getTime()) / HOUR;
      if (age < HOLD[s._tier] + 24 || (s.creator_id === mainClipper.id && rnd() < 0.35) || rnd() < 0.2) continue;
      s.payout_transferred = s.payout_earned;
      if (s.payout_transferred >= c.cpm_cap) s.status = 'paid';
      transferred += s.payout_transferred;
      const fee = cents((s.payout_transferred * TIER_FEE[s._tier]) / 100);
      const ext = `tr_test_${code(14)}`;
      ledger.push({ campaign_id: c.id, submission_id: s.id, entry_type: 'creator_payout', amount: s.payout_transferred, stripe_object_id: ext, created_at: ago(Math.max(1, (Date.now() - new Date(s.approved_at).getTime()) / HOUR - HOLD[s._tier])) });
      if (fee > 0) ledger.push({ campaign_id: c.id, submission_id: s.id, entry_type: 'platform_fee', amount: fee, stripe_object_id: ext, created_at: ledger[ledger.length - 1].created_at });
    }
    if (deposit < transferred) deposit = Math.ceil(transferred / 50) * 50 + 50;
    if (deposit > 0) ledger.unshift({ campaign_id: c.id, entry_type: 'deposit', amount: deposit, stripe_object_id: `pi_test_${code(14)}`, created_at: c.created_at });
    c.escrow_balance = cents(deposit - transferred);
  }
  await insert(db, 'campaigns', campaigns.map(({ _budgetFactor, _noSubs, _main, ...c }) => c));
  await insert(db, 'campaign_creators', enrollments, 1000);
  await insert(db, 'submissions', subs.map(({ _tier, ...s }) => s), 1000);
  await insert(db, 'escrow_ledger', ledger, 1000);

  // View history for charts: a log every 3 days over the last month, growing to today's count.
  const logs: Row[] = [];
  for (const s of subs) {
    const born = new Date(s.created_at).getTime();
    for (let d = 29; d >= 0; d -= 3) {
      const at = Date.now() - d * 24 * HOUR;
      if (at < born) continue;
      const t = Math.min(1, (at - born) / Math.max(1, Date.now() - born));
      logs.push({ submission_id: s.id, captured_at: new Date(at).toISOString(), view_count: Math.round(s.current_view_count * Math.pow(t, 0.6)) });
    }
  }
  await insert(db, 'social_metrics_logs', logs, 2000);

  // ── invites, moments, cash-outs, support ──
  const mainActive = campaigns.filter((c) => c._main && c.status === 'active');
  const privateLive = campaigns.find((c) => c.title.startsWith('Private: VIP'))!;
  const privateDraft = campaigns.find((c) => c.title.startsWith('Draft: invite only'));
  const invites: Row[] = [];
  const invited = new Set();
  const invite = (c: Row | undefined, cr: Row, status: string, message: string | null) => {
    if (!c) return;
    const k = `${c.id}:${cr.id}`;
    if (invited.has(k)) return;
    invited.add(k);
    invites.push({ campaign_id: c.id, creator_id: cr.id, status, message, created_at: ago(int(1, 200)) });
  };
  for (const cr of creators.slice(1, 12)) invite(privateLive, cr, pick(['pending', 'accepted', 'accepted', 'declined']), 'Loved your clips. Want in on our VIP campaign?');
  for (const cr of creators.slice(1, 8)) if (enroll.has(`${privateLive.id}:${cr.id}`) || rnd() < 0.5) join(privateLive, cr, ago(int(2, 100)));
  invite(privateLive, mainClipper, 'pending', 'Your gaming edits are great. This one is invite only.');
  invite(privateDraft, mainClipper, 'pending', 'Launching this soon, want to clip it?');
  const notJoined = mainActive.filter((c) => !enroll.has(`${c.id}:${mainClipper.id}`) && c.min_tier === 'silver');
  if (notJoined[0]) invite(notJoined[0], mainClipper, 'pending', null);
  for (const c of some(mainActive, 6)) for (const cr of some(creators.slice(0, 60), 3)) if (!enroll.has(`${c.id}:${cr.id}`)) invite(c, cr, pick(['pending', 'declined']), null);
  // Joins added for the private campaign above.
  const extraJoins = enrollments.filter((e) => e.campaign_id === privateLive.id);
  await db.from('campaign_creators').upsert(extraJoins, { onConflict: 'campaign_id,creator_id', ignoreDuplicates: true });
  await insert(db, 'campaign_invites', invites);

  const momentCamps = campaigns.filter((c) => c.moments_enabled && c.status === 'active');
  const moments = momentCamps.flatMap((c) =>
    ['Insane 1v4 clutch', 'Chat goes wild', 'Rage quit moment', 'Funniest fail', 'Big announcement'].slice(0, int(2, 5)).map((t) => ({ id: uid(), campaign_id: c.id, title: t, timestamp_label: `${int(0, 5)}:${String(int(0, 59)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`, vod_url: 'https://www.twitch.tv/videos/123456789', max_claims: pick([1, 2, 3, 5]) })),
  );
  if (moments.length) await insert(db, 'campaign_moments', moments);

  await insert(db, 'cashouts', [
    { creator_id: mainClipper.id, amount: 182.4, fee: 14.59, created_at: ago(200) },
    { creator_id: mainClipper.id, amount: 96.1, fee: 7.69, created_at: ago(30) },
    { creator_id: majestyClipper.id, amount: 4210.55, fee: 168.42, created_at: ago(12) },
  ]);

  const tickets = [
    [accounts.clipper, 'clipper', 'payouts', 'Cash-out still pending', 'I cashed out yesterday and it still says pending. How long does it take?'],
    [creators[5].user_id, 'clipper', 'clips', 'Clip flagged by mistake', 'My clip was flagged for missing credit but the credit is in the first second.'],
    [accounts.streamer, 'streamer', 'billing', 'Refund for ended campaign', 'I ended a campaign early. When does the unspent budget come back?'],
    [creators[40].user_id, 'clipper', 'account', 'Change my TikTok account', 'I want to connect a different TikTok account.'],
    [brands[4].owner_id, 'streamer', 'other', 'Bulk approve clips?', 'Is there a way to approve many clips at once?'],
  ].map(([user_id, role, category, subject, message]) => ({ user_id, role, category, subject, message, email: null, transcript: [] }));
  const { error: tErr } = await db.from('support_tickets').insert(tickets);
  if (tErr) throw new Error(`support_tickets: ${tErr.message}`);

  return (` ${brands.length} businesses, ${creators.length} clippers, ${campaigns.length} campaigns, ${subs.length} clips (${subs.filter((s) => s.status === 'pending_review').length} waiting for review), ${ledger.length} ledger rows, ${logs.length} view logs, ${invites.length} invites`);
}


const TEST_EMAIL = /@atlas\.test$/i;

/** Ids of every @atlas.test account. */
async function testUserIds(db: SupabaseClient): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    ids.push(...data.users.filter((u) => TEST_EMAIL.test(u.email ?? '')).map((u) => u.id));
    if (data.users.length < 1000) return ids;
  }
}

export async function hasTestData(db: SupabaseClient): Promise<number> {
  return (await testUserIds(db)).length;
}

/**
 * Deletes every @atlas.test account and everything they made. Money records go first
 * (the ledger blocks deleting a campaign), then the accounts, which cascade to
 * brands, clippers, campaigns, clips, invites, view history and tickets.
 */
export async function removeTestData(db: SupabaseClient): Promise<string> {
  const users = await testUserIds(db);
  if (!users.length) return 'No test data to remove.';
  for (let i = 0; i < users.length; i += 150) {
    const { data: brands } = await db.from('brands').select('id').in('owner_id', users.slice(i, i + 150));
    const brandIds = (brands ?? []).map((b) => b.id as string);
    if (!brandIds.length) continue;
    const { data: camps } = await db.from('campaigns').select('id').in('brand_id', brandIds);
    const campIds = (camps ?? []).map((c) => c.id as string);
    for (let j = 0; j < campIds.length; j += 150) {
      const { error } = await db.from('escrow_ledger').delete().in('campaign_id', campIds.slice(j, j + 150));
      if (error) throw new Error(`escrow_ledger: ${error.message}`);
    }
  }
  for (const id of users) {
    const { error } = await db.auth.admin.deleteUser(id);
    // Already gone (e.g. Remove tapped twice) is fine.
    if (error && !/not found/i.test(error.message)) throw new Error(`delete user: ${error.message}`);
  }
  return `Removed ${users.length} test accounts and everything they made.`;
}
