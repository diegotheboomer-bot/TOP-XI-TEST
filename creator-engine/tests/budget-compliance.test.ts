import { describe, expect, it } from 'vitest';
import { budgetStats } from '@/lib/budget';
import { hasDisclosure, reviewDueIn, shouldAutoApprove } from '@/lib/compliance';

const now = new Date('2026-03-11T00:00:00Z').getTime();
const tenDaysAgo = new Date(now - 10 * 86_400_000).toISOString();

describe('budgetStats', () => {
  it('splits paid, owed and available and forecasts days left', () => {
    // 10,000 deposited, 2,000 paid (escrow 8,000), 1,000 owed, over 10 days → 300/day
    const b = budgetStats({ deposited: 10_000, escrow: 8_000, owed: 1_000, createdAt: tenDaysAgo, now });
    expect(b.committed).toBe(3_000);
    expect(b.available).toBe(7_000);
    expect(b.usedShare).toBeCloseTo(0.3);
    expect(b.daysLeft).toBe(23);
  });
  it('has no forecast before any spend', () => {
    expect(budgetStats({ deposited: 5_000, escrow: 5_000, owed: 0, createdAt: tenDaysAgo, now }).daysLeft).toBeNull();
  });
  it('never reports negative availability', () => {
    expect(budgetStats({ deposited: 100, escrow: 50, owed: 80, createdAt: tenDaysAgo, now }).available).toBe(0);
  });
});

describe('hasDisclosure', () => {
  it.each(['New flavor drop #ad', '#Sponsored by Voltline', 'thanks @voltline #partner', 'fuel up #ad\n#fyp'])('accepts %s', (c) => {
    expect(hasDisclosure(c)).toBe(true);
  });
  it.each(['#adventure time', 'love this #badge', 'no tags here', '', null, 'ad', 'email#ad'])('rejects %s', (c) => {
    expect(hasDisclosure(c)).toBe(false);
  });
});

describe('auto-approval', () => {
  const base = { status: 'pending_review', fraud_score: 0, has_disclosure: true };
  it('counts down from creation', () => {
    expect(reviewDueIn(new Date(now - 30 * 3_600_000).toISOString(), 48, now)).toBe(18 * 3_600_000);
  });
  it('approves clean submissions once due', () => {
    expect(shouldAutoApprove({ ...base, created_at: new Date(now - 49 * 3_600_000).toISOString() }, 48, now)).toBe(true);
  });
  it('waits until due', () => {
    expect(shouldAutoApprove({ ...base, created_at: new Date(now - 47 * 3_600_000).toISOString() }, 48, now)).toBe(false);
  });
  it('never auto-approves without disclosure or with a fraud signal', () => {
    const due = new Date(now - 72 * 3_600_000).toISOString();
    expect(shouldAutoApprove({ ...base, created_at: due, has_disclosure: false }, 48, now)).toBe(false);
    expect(shouldAutoApprove({ ...base, created_at: due, fraud_score: 40 }, 48, now)).toBe(false);
  });
});
