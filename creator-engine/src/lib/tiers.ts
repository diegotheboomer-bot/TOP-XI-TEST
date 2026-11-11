// Clipper tiers, worked out from a clipper's real track record. Higher tiers get
// cheaper cash-outs, sit higher in streamers' review lists and can join gated campaigns.

export const TIERS = ['silver', 'gold', 'diamond', 'majesty'] as const;
export type Tier = (typeof TIERS)[number];

export interface ClipperRecord {
  /** Verified views across all clips that weren't flagged. */
  views: number;
  /** Clips the streamer approved (live or paid). */
  approved: number;
  /** Clips flagged by a streamer or the fraud checks. */
  flagged: number;
  /** Clips flagged as fraud (bot views, duplicates) in the last 90 days. */
  recentFraud: number;
}

interface TierRule {
  views: number;
  approved: number;
  /** Share of reviewed clips that were approved, 0–1. */
  approvalRate: number;
  noFraud: boolean;
}

export const TIER_RULES: Record<Tier, TierRule> = {
  silver: { views: 0, approved: 0, approvalRate: 0, noFraud: false },
  gold: { views: 250_000, approved: 5, approvalRate: 0.8, noFraud: false },
  diamond: { views: 2_500_000, approved: 25, approvalRate: 0.9, noFraud: false },
  majesty: { views: 10_000_000, approved: 75, approvalRate: 0.95, noFraud: true },
};

export interface TierPerks {
  /** Free cash-outs per 7 days; Infinity = unlimited. */
  freeCashouts: number;
  minCashout: number;
}

export const TIER_PERKS: Record<Tier, TierPerks> = {
  silver: { freeCashouts: 1, minCashout: 10 },
  gold: { freeCashouts: 3, minCashout: 5 },
  diamond: { freeCashouts: 7, minCashout: 5 },
  majesty: { freeCashouts: Infinity, minCashout: 1 },
};

export const TIER_LABEL: Record<Tier, string> = { silver: 'Silver', gold: 'Gold', diamond: 'Diamond', majesty: 'Majesty' };

export const approvalRate = (r: ClipperRecord) => (r.approved + r.flagged > 0 ? r.approved / (r.approved + r.flagged) : 1);

function meets(r: ClipperRecord, rule: TierRule): boolean {
  return r.views >= rule.views && r.approved >= rule.approved && approvalRate(r) >= rule.approvalRate && (!rule.noFraud || r.recentFraud === 0);
}

export function tierFor(r: ClipperRecord): Tier {
  for (const t of [...TIERS].reverse()) if (meets(r, TIER_RULES[t])) return t;
  return 'silver';
}

export const tierRank = (t: Tier) => TIERS.indexOf(t);
export const atLeast = (t: Tier, min: Tier) => tierRank(t) >= tierRank(min);

/** What's still missing for the next tier, as progress 0–1 per requirement. */
export function nextTierProgress(r: ClipperRecord): { next: Tier; items: { label: string; have: number; need: number }[] } | null {
  const current = tierFor(r);
  const next = TIERS[tierRank(current) + 1];
  if (!next) return null;
  const rule = TIER_RULES[next];
  return {
    next,
    items: [
      { label: 'Verified views', have: r.views, need: rule.views },
      { label: 'Approved clips', have: r.approved, need: rule.approved },
      { label: 'Approval rate', have: Math.round(approvalRate(r) * 100), need: Math.round(rule.approvalRate * 100) },
    ],
  };
}

/** Builds a record from a clipper's submissions. */
export function recordFrom(subs: { status: string; current_view_count: number; fraud_score: number; created_at: string }[], now = Date.now()): ClipperRecord {
  const ninety = now - 90 * 86_400_000;
  return {
    views: subs.filter((s) => s.status !== 'flagged').reduce((n, s) => n + Number(s.current_view_count), 0),
    approved: subs.filter((s) => s.status === 'live_tracking' || s.status === 'paid').length,
    flagged: subs.filter((s) => s.status === 'flagged').length,
    recentFraud: subs.filter((s) => s.status === 'flagged' && Number(s.fraud_score) >= 70 && new Date(s.created_at).getTime() >= ninety).length,
  };
}
