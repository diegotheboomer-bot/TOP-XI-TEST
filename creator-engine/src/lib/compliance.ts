// Ad disclosure (FTC: sponsored posts must be clearly marked) and review deadlines.

const DISCLOSURE = /(^|[^\w#])#(ad|ads|sponsored|partner|paidpartnership|brandpartner)(?![\w])/i;

/** True when a caption carries a recognised ad disclosure hashtag. */
export function hasDisclosure(caption: string | null | undefined): boolean {
  return !!caption && DISCLOSURE.test(caption);
}

/** Milliseconds until a pending submission is auto-approved (negative once due). */
export function reviewDueIn(createdAt: string, autoApproveHours: number, now = Date.now()): number {
  return new Date(createdAt).getTime() + autoApproveHours * 3_600_000 - now;
}

/**
 * A pending submission is approved automatically once its review window has
 * passed, but only if nothing about it needs a human: no fraud signal and a
 * disclosed caption.
 */
export function shouldAutoApprove(s: { status: string; created_at: string; fraud_score: number }, autoApproveHours: number, now = Date.now()): boolean {
  return s.status === 'pending_review' && s.fraud_score < 30 && reviewDueIn(s.created_at, autoApproveHours, now) <= 0;
}

/** True when the caption contains the clipper's code as a whole word (any case). Proves who posted the video. */
export function hasClipCode(caption: string | null | undefined, code: string): boolean {
  if (!caption || !code) return false;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(caption);
}
