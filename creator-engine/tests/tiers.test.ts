import { describe, expect, it } from 'vitest';
import { nextTierProgress, recordFrom, tierFor } from '@/lib/tiers';

const r = (views: number, approved: number, flagged = 0, recentFraud = 0) => ({ views, approved, flagged, recentFraud });

describe('tiers', () => {
  it('starts everyone at Silver', () => expect(tierFor(r(0, 0))).toBe('silver'));
  it('reaches Gold on views, clips and approval rate', () => expect(tierFor(r(300_000, 5, 1))).toBe('gold'));
  it('holds back a tier when approval rate is too low', () => expect(tierFor(r(3_000_000, 30, 5))).toBe('gold'));
  it('reaches Diamond', () => expect(tierFor(r(3_000_000, 30, 2))).toBe('diamond'));
  it('needs a clean record for Majesty', () => {
    expect(tierFor(r(12_000_000, 80, 2))).toBe('majesty');
    expect(tierFor(r(12_000_000, 80, 2, 1))).toBe('diamond');
  });
  it('shows what is left for the next tier', () => {
    const p = nextTierProgress(r(100_000, 2));
    expect(p?.next).toBe('gold');
    expect(p?.items[0]).toEqual({ label: 'Verified views', have: 100_000, need: 250_000 });
  });
  it('builds a record from clips', () => {
    const now = Date.now();
    const rec = recordFrom(
      [
        { status: 'paid', current_view_count: 1000, fraud_score: 0, created_at: new Date(now).toISOString() },
        { status: 'flagged', current_view_count: 500, fraud_score: 90, created_at: new Date(now).toISOString() },
        { status: 'pending_review', current_view_count: 200, fraud_score: 0, created_at: new Date(now).toISOString() },
      ],
      now,
    );
    expect(rec).toEqual({ views: 1200, approved: 1, flagged: 1, recentFraud: 1 });
  });
});
