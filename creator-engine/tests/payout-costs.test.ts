import { describe, expect, it } from 'vitest';
import { stripePayoutCost } from '@/lib/payout-costs';

describe('Stripe payout cost passed on at cash-out', () => {
  it('is 0.25% + $0.15; Atlas pays the monthly account fee', () => {
    expect(stripePayoutCost(100, false)).toBe(0.4);
    expect(stripePayoutCost(100, true)).toBe(0.4);
    expect(stripePayoutCost(5, false)).toBe(0.16);
  });
});
