// When clippers get paid. An approved clip is paid automatically once the hold
// has passed; until then the streamer can still flag it. After that it's locked,
// so a streamer can't take back money a clipper has earned.

/** Hours between approval and the automatic payout (also the streamer's window to flag). */
export const HOLD_HOURS = 72;
/** Smallest amount paid out automatically, to keep per-payout costs down. The rest goes out when the campaign ends. */
export const MIN_AUTO_PAYOUT = 10;

const HOUR = 3_600_000;

/** Hours left in the hold, 0 when it has passed (or the clip isn't approved yet). */
export function holdHoursLeft(approvedAt: string | null, now = Date.now()): number {
  if (!approvedAt) return 0;
  return Math.max(0, HOLD_HOURS - (now - new Date(approvedAt).getTime()) / HOUR);
}

interface ClipState {
  status: 'pending_review' | 'live_tracking' | 'flagged' | 'paid';
  approved_at: string | null;
}

/** The streamer can flag a clip while it's under review, or within the hold after approval. */
export function streamerCanFlag(c: ClipState, now = Date.now()): boolean {
  if (c.status === 'pending_review') return true;
  if (c.status === 'live_tracking') return holdHoursLeft(c.approved_at, now) > 0;
  return false;
}

/** Whether the sync should pay this clip now. `owed` is earned minus already transferred. */
export function autoPayoutDue(c: ClipState & { owed: number; campaignEnded: boolean }, now = Date.now()): boolean {
  if (c.status !== 'live_tracking' || !c.approved_at) return false;
  if (holdHoursLeft(c.approved_at, now) > 0) return false;
  return c.owed >= (c.campaignEnded ? 1 : MIN_AUTO_PAYOUT);
}

// Cash-outs: clippers choose when to get paid. One free cash-out every 7 days,
// then a small fee for each extra one (it covers the extra transfer costs).
export const MIN_CASHOUT = 10;
export const FREE_CASHOUTS_PER_WEEK = 1;
export const EXTRA_CASHOUT_FEE = 1;

/** Fee for the next cash-out, given how many the clipper made in the last 7 days. */
export const cashoutFee = (recentCount: number) => (recentCount >= FREE_CASHOUTS_PER_WEEK ? EXTRA_CASHOUT_FEE : 0);

/** Approved clips past the hold, with money not yet sent, can be cashed out. */
export function cashoutReady(c: ClipState, now = Date.now()): boolean {
  return c.status === 'live_tracking' && !!c.approved_at && holdHoursLeft(c.approved_at, now) <= 0;
}
