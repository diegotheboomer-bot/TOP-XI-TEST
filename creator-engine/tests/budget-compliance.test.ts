import { describe, expect, it } from 'vitest';
import { budgetStats } from '@/lib/budget';
import { hasDisclosure } from '@/lib/compliance';

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
  it.each(['New flavor drop #ad', '#Sponsored by Marlow', 'thanks @marlowkade #partner', 'fuel up #ad\n#fyp'])('accepts %s', (c) => {
    expect(hasDisclosure(c)).toBe(true);
  });
  it.each(['#adventure time', 'love this #badge', 'no tags here', '', null, 'ad', 'email#ad'])('rejects %s', (c) => {
    expect(hasDisclosure(c)).toBe(false);
  });
});


import { hasClipCode } from '@/lib/compliance';
describe('hasClipCode', () => {
  it.each(['Insane clutch #ad code MK7Q2X', 'mk7q2x', 'clip code: MK7Q2X!', 'MK7Q2X\n#ad'])('finds it in %s', (c) => expect(hasClipCode(c, 'MK7Q2X')).toBe(true));
  it.each(['MK7Q2XY', 'XMK7Q2X', 'MK7Q2', '', null])('rejects %s', (c) => expect(hasClipCode(c, 'MK7Q2X')).toBe(false));
});
