import { describe, expect, it } from 'vitest';
import { cardPercent, depositRate, grossUp } from '@/lib/card-fees';

describe('deposit fees: the business pays only Stripe, the campaign gets the full budget', () => {
  it('picks Stripe’s rate by card', () => {
    expect(cardPercent({ country: 'US', funding: 'credit' })).toBe(3.15);
    expect(cardPercent({ country: 'GB', funding: 'debit' })).toBe(2.5);
    expect(cardPercent({ country: 'DE', funding: 'debit' })).toBe(1.5);
    expect(cardPercent({ country: 'PT', funding: 'credit' })).toBe(2.8);
    expect(depositRate({ country: 'US' }, 2).percent).toBe(5.15);
  });
  it('grosses up so exactly the budget is left after Stripe’s cut', () => {
    for (const budget of [50, 999.99, 5000, 123456]) {
      const { percent, fixed } = depositRate({ country: 'US' }, 2);
      const c = grossUp(budget, percent, fixed);
      const left = c.total - (c.total * percent) / 100 - fixed;
      expect(left).toBeGreaterThanOrEqual(budget - 0.005);
      expect(left).toBeLessThan(budget + 0.02);
      expect(Math.round((c.budget + c.fee) * 100)).toBe(Math.round(c.total * 100));
    }
  });
});
