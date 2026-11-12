import { describe, expect, it } from 'vitest';
import { stripePayoutCost } from '@/lib/payout-costs';

describe('Stripe payout cost passed on at cash-out', () => {
  it('is 0.25% + $0.15, plus $2.40 on the first cash-out of the month', () => {
    expect(stripePayoutCost(100, false)).toBe(0.4);
    expect(stripePayoutCost(100, true)).toBe(2.8);
    expect(stripePayoutCost(5, false)).toBe(0.16);
  });
});
