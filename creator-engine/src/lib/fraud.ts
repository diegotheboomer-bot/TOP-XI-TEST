/** Hamming similarity of two 64-bit perceptual hashes given as 16-char hex. 1 = identical. */
export function hashSimilarity(a: string, b: string): number {
  const x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let bits = 0;
  for (let v = x; v > 0n; v >>= 1n) bits += Number(v & 1n);
  return 1 - bits / 64;
}

/** > 95% identical ⇒ duplicate (at most 3 of 64 bits differ). */
export const DUPLICATE_THRESHOLD = 0.95;

export interface MetricSample {
  capturedAt: Date;
  views: number;
  comments: number;
}

// Spec: +10,000 views in under 5 minutes with a comment-to-view ratio below 0.05%.
const BURST_VIEWS = 10_000;
const BURST_WINDOW_MIN = 5;
const MIN_COMMENT_RATIO = 0.0005;

/**
 * Bot-farm check between two consecutive samples. The rule is expressed as a
 * rate (≥ 2,000 views/min) so it still applies when samples are further than
 * 5 minutes apart — but it can only see bursts the polling interval resolves.
 */
export function detectBotVelocity(prev: MetricSample, curr: MetricSample): { flagged: boolean; viewsPerMinute: number; commentRatio: number } {
  const minutes = Math.max((curr.capturedAt.getTime() - prev.capturedAt.getTime()) / 60_000, 1 / 60);
  const delta = curr.views - prev.views;
  const viewsPerMinute = delta / minutes;
  const commentRatio = curr.views > 0 ? curr.comments / curr.views : 0;
  const burst = delta > BURST_VIEWS && viewsPerMinute >= BURST_VIEWS / BURST_WINDOW_MIN;
  return { flagged: burst && commentRatio < MIN_COMMENT_RATIO, viewsPerMinute, commentRatio };
}

// Paid boosts (TikTok Promote, ads) bring views with far fewer likes and comments
// than organic ones. Typical short-form clips get a few percent; below 0.3% at
// this many views is held for the streamer to check before it earns more.
export const LOW_ENGAGEMENT_MIN_VIEWS = 20_000;
export const LOW_ENGAGEMENT_RATIO = 0.003;

/** Likes + comments per view far below normal: a sign the clip may be paid-promoted. */
export function detectLowEngagement(s: { views: number; likes: number; comments: number }): { flagged: boolean; ratio: number } {
  const ratio = s.views > 0 ? (s.likes + s.comments) / s.views : 0;
  return { flagged: s.views >= LOW_ENGAGEMENT_MIN_VIEWS && ratio < LOW_ENGAGEMENT_RATIO, ratio };
}

/** Prefix of the flag reason, so approving it can clear the check for that clip. */
export const LOW_ENGAGEMENT_REASON = 'Low engagement';

// ─── Real-engagement benchmarks (researched Nov 2026) ─────────────────────
// TikTok, 460,483 public posts (buzzabout.ai, Jul 2026): (likes+comments+shares)/views
//   p10 0.8%, p25 1.9%, median 4.0%, p75 7.0%, p90 11.1%, p99 22.5%. Overall split:
//   likes ≈ 5.1%, shares ≈ 0.46%, comments ≈ 0.055% of views (comments ≈ 1% of likes).
// YouTube Shorts (overseeros.com, 17,185 Shorts): likes/views median 2.08%, p90 5.38%;
//   about 1.8 comments per 100 likes. Shorts views were redefined on 31 Mar 2025, which
//   lowered ratios, so Shorts get a lower floor. YouTube shows no shares.
// Instagram Reels: no clean per-view benchmark exists (sources disagree), so TikTok-like
//   floors are used, a little lower. Instagram's API gives no shares here.
// Within one creator, the best 10% of posts get ~2.6× the engagement of the worst 10%
//   (buzzabout.ai), so a clip at a fifth of the clipper's own usual rate is unusual.
// Fake views on YouTube are often removed later, which shows up as view counts going
//   down (arxiv.org/abs/2210.01096: corrections touch ~61% of videos but are small,
//   ~0.5% of views), so only a big drop counts.
export type VideoPlatform = 'tiktok' | 'youtube' | 'instagram';
export const BENCHMARKS: Record<VideoPlatform, { lowFloor: number; maxLikeRate: number; hasShares: boolean }> = {
  // lowFloor: engagement per view under this (at 20K+ views) is far below the bottom 10% of real clips.
  tiktok: { lowFloor: 0.003, maxLikeRate: 0.35, hasShares: true },
  youtube: { lowFloor: 0.002, maxLikeRate: 0.3, hasShares: false },
  instagram: { lowFloor: 0.0025, maxLikeRate: 0.35, hasShares: false },
};

// ─── View checks on every sync ─────────────────────────────────────────────
// Real views bring likes, comments and shares along with them, and grow in a curve
// (fast at first, then slower). Bought views arrive as a sudden step with almost no
// new engagement. Each check below looks at one of those signals; together they
// decide whether a clip is fine, held for the business to check, or flagged as fraud.

export interface StatsSample {
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export type ViewCheck = { level: 'ok' | 'review' | 'fraud'; score: number; reasons: string[] };

/** Reason prefix for clips held for the business to check; approving clears the static checks. */
export const REVIEW_REASON = 'Check views';

const pct = (n: number, digits = 2) => `${(n * 100).toFixed(digits)}%`;
const num = (n: number) => Math.round(n).toLocaleString('en-US');
const engagementOf = (s: StatsSample) => s.likes + s.comments + s.shares;

/**
 * `history` is oldest → newest and ends with the sample just taken. `cleared` means the
 * business already looked at this clip and approved it, so ratios it accepted aren't
 * re-raised; new sudden jumps still are. `creatorRate`: the clipper's usual engagement per view
 * on their other clips (when they have a few), to compare against.
 */
export function assessViews(
  history: StatsSample[],
  { cleared = false, platform = 'tiktok', creatorRate }: { cleared?: boolean; platform?: VideoPlatform; creatorRate?: number } = {},
): ViewCheck {
  const bench = BENCHMARKS[platform];
  const curr = history[history.length - 1];
  const prev = history[history.length - 2];
  const before = history[history.length - 3];
  const reasons: string[] = [];
  let score = 0;
  if (!curr) return { level: 'ok', score: 0, reasons };

  if (prev) {
    // 1. Bot burst: the original rule (+10K views in 5 minutes with almost no comments).
    const burst = detectBotVelocity(
      { capturedAt: prev.capturedAt, views: prev.views, comments: prev.comments },
      { capturedAt: curr.capturedAt, views: curr.views, comments: curr.comments },
    );
    if (burst.flagged) return { level: 'fraud', score: 90, reasons: [`${num(burst.viewsPerMinute)} views a minute with ${pct(burst.commentRatio, 3)} comments`] };

    // Views went down: platforms remove fake views they catch, so a real drop is a warning sign.
    if (prev.views - curr.views >= 1_000 && curr.views < prev.views * 0.9) {
      score += 60;
      reasons.push(`views dropped from ${num(prev.views)} to ${num(curr.views)} (the platform may have removed fake views)`);
    }

    // 2. Hollow jump: lots of new views since the last check, but almost none of the
    //    likes and comments those views would normally bring. Works however far apart checks are.
    const dViews = curr.views - prev.views;
    const dEng = Math.max(0, engagementOf(curr) - engagementOf(prev));
    const baseline = prev.views >= 1_000 ? engagementOf(prev) / prev.views : 0.02;
    const marginal = dViews > 0 ? dEng / dViews : 1;
    if (dViews >= 5_000 && marginal < Math.min(0.002, baseline * 0.25)) {
      score += 70;
      reasons.push(`${num(dViews)} new views since the last check brought only ${num(dEng)} new likes, comments and shares (${pct(marginal, 3)}, the clip normally gets ${pct(baseline)})`);

      // 3. …and it sped up out of nowhere instead of growing in a curve.
      if (before) {
        const rate = (a: StatsSample, b: StatsSample) => (b.views - a.views) / Math.max(1, (b.capturedAt.getTime() - a.capturedAt.getTime()) / 60_000);
        const earlier = rate(before, prev);
        const now = rate(prev, curr);
        if (now >= 3 * Math.max(earlier, 1)) {
          score += 20;
          reasons.push(`views came in ${Math.round(now / Math.max(earlier, 1))}× faster than before`);
        }
      }
    }
  }

  if (!cleared) {
    const rate = curr.views > 0 ? engagementOf(curr) / curr.views : 0;
    // 4. Low engagement overall (bought views or paid promotion): far under the bottom 10% of real clips.
    if (curr.views >= LOW_ENGAGEMENT_MIN_VIEWS && rate < bench.lowFloor) {
      score += 60;
      reasons.push(`only ${pct(rate)} likes, comments and shares per view at ${num(curr.views)} views (real clips almost always get over ${pct(bench.lowFloor, 1)})`);
    }
    // 5. Far too many likes for the views (bought likes): above even the top 1% of real clips.
    if (curr.views >= 5_000 && curr.likes / curr.views > bench.maxLikeRate) {
      score += 50;
      reasons.push(`${pct(curr.likes / curr.views, 0)} of viewers liked it, far above normal`);
    }
    // 6. Comment bots: comments are normally about 1–2% of likes; half or more is not normal.
    if (curr.comments >= 200 && curr.comments >= curr.likes * 0.5) {
      score += 50;
      reasons.push(`${num(curr.comments)} comments for ${num(curr.likes)} likes (normally about 1–2 comments per 100 likes)`);
    }
    // 7. Far below this clipper's own usual rate. Only adds weight to other signs.
    if (creatorRate && curr.views >= 5_000 && rate < creatorRate / 5) {
      score += 30;
      reasons.push(`a fifth of this clipper’s usual ${pct(creatorRate)} engagement`);
    }
    // 8. Shares (TikTok): almost nobody shared a big clip. Only adds weight to other signs.
    if (bench.hasShares && score > 0 && curr.views >= 50_000 && curr.shares / curr.views < 0.0002) {
      score += 15;
      reasons.push(`almost no shares (${num(curr.shares)})`);
    }
  }

  return { level: score >= 85 ? 'fraud' : score >= 50 ? 'review' : 'ok', score: Math.min(score, 100), reasons };
}
