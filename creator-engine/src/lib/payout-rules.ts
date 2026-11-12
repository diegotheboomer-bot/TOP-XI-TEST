// When clippers get paid. An approved clip is paid automatically once the hold
// has passed; until then the streamer can still flag it. After that it's locked,
// so a streamer can't take back money a clipper has earned.

/** Hours between approval and the automatic payout (also the streamer's window to flag). */
export const HOLD_HOURS = 72;
/**
 * Smallest cash-out (and automatic payout). Stripe charges Atlas for every payout to a bank
 * (€0.10 + 0.25%) and €2 for each account paid in a month, so tiny payouts cost more than the 2% fee.
 */
export const MIN_CASHOUT = 20;
export const MIN_AUTO_PAYOUT = MIN_CASHOUT;

const HOUR = 3_600_000;

/** Hours left in the hold, 0 when it has passed (or the clip isn't approved yet). Higher tiers have shorter holds. */
export function holdHoursLeft(approvedAt: string | null, now = Date.now(), holdHours = HOLD_HOURS): number {
  if (!approvedAt) return 0;
  return Math.max(0, holdHours - (now - new Date(approvedAt).getTime()) / HOUR);
}

interface ClipState {
  status: 'pending_review' | 'live_tracking' | 'flagged' | 'paid';
  approved_at: string | null;
}

/** The streamer can flag a clip while it's under review, or within the hold after approval. */
export function streamerCanFlag(c: ClipState, now = Date.now(), holdHours = HOLD_HOURS): boolean {
  if (c.status === 'pending_review') return true;
  if (c.status === 'live_tracking') return holdHoursLeft(c.approved_at, now, holdHours) > 0;
  return false;
}

/** Whether the sync should pay this clip now. `owed` is earned minus already transferred. */
export function autoPayoutDue(c: ClipState & { owed: number; campaignEnded: boolean }, now = Date.now(), holdHours = HOLD_HOURS): boolean {
  if (c.status !== 'live_tracking' || !c.approved_at) return false;
  if (holdHoursLeft(c.approved_at, now, holdHours) > 0) return false;
  return c.owed >= MIN_AUTO_PAYOUT;
}

// Cash-outs: clippers choose when to get paid. The fee, how often they can cash out and
// how long the hold lasts depend on their tier (see tiers.ts).

/** Approved clips past the hold, with money not yet sent, can be cashed out. */
export function cashoutReady(c: ClipState, now = Date.now(), holdHours = HOLD_HOURS): boolean {
  return c.status === 'live_tracking' && !!c.approved_at && holdHoursLeft(c.approved_at, now, holdHours) <= 0;
}
