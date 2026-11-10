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
