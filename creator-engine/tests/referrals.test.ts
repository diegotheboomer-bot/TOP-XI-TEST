import { describe, expect, it } from 'vitest';
import { inReferralWindow, validCode } from '@/lib/referrals';

describe('referrals', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
  it('gives the inviter the fee for the first 90 days only', () => {
    expect(inReferralWindow(daysAgo(1), now)).toBe(true);
    expect(inReferralWindow(daysAgo(89.9), now)).toBe(true);
    expect(inReferralWindow(daysAgo(90), now)).toBe(false);
  });
  it('accepts only real-looking codes', () => {
    expect(validCode('813CE4F0')).toBe(true);
    expect(validCode('813ce4f0')).toBe(false);
    expect(validCode("x' or 1=1")).toBe(false);
    expect(validCode(undefined)).toBe(false);
  });
});
