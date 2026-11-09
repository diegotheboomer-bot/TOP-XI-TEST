import { describe, expect, it } from 'vitest';
import { calculatePayout, streamerCharge, type PayoutTerms } from '@/lib/payout';

const terms = (t: Partial<PayoutTerms>): PayoutTerms => ({ payout_model: 'hybrid', base_payout: 0, cpm_rate: 0, cpm_cap: 1000, cps_commission_pct: 0, ...t });

describe('calculatePayout', () => {
  it('hybrid = base + views/1000 × CPM', () => {
    expect(calculatePayout(terms({ base_payout: 50, cpm_rate: 2.5 }), 128_400)).toBe(371);
  });
  it('floors to the cent', () => {
    expect(calculatePayout(terms({ base_payout: 50, cpm_rate: 2.5 }), 86_250)).toBe(265.62);
  });
  it('pure CPM ignores the base', () => {
    expect(calculatePayout(terms({ payout_model: 'pure_cpm', base_payout: 50, cpm_rate: 3 }), 10_000)).toBe(30);
  });
  it('cost per sale uses attributed revenue', () => {
    expect(calculatePayout(terms({ payout_model: 'cps_performance', cps_commission_pct: 12 }), 999_999, 1790)).toBe(214.8);
  });
  it('enforces the cap', () => {
    expect(calculatePayout(terms({ base_payout: 50, cpm_rate: 2.5, cpm_cap: 400 }), 5_000_000)).toBe(400);
  });
  it('never goes negative', () => {
    expect(calculatePayout(terms({ payout_model: 'pure_cpm', cpm_rate: 2 }), -50)).toBe(0);
  });
});

describe('streamerCharge', () => {
  it('adds 9% on top of the budget', () => expect(streamerCharge(1000, 9)).toEqual({ budget: 1000, fee: 90, total: 1090 }));
  it('rounds the fee to the cent', () => expect(streamerCharge(333.33, 9)).toEqual({ budget: 333.33, fee: 30, total: 363.33 }));
  it('total is always budget + fee', () => {
    for (const b of [50, 99.99, 1234.56, 75_000]) {
      const c = streamerCharge(b, 9);
      expect(Math.round(c.total * 100)).toBe(Math.round(c.budget * 100) + Math.round(c.fee * 100));
    }
  });
});
