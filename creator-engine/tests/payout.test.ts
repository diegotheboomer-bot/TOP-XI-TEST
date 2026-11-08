import { describe, expect, it } from 'vitest';
import { calculatePayout, splitFee, type PayoutTerms } from '@/lib/payout';

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

describe('splitFee', () => {
  it('takes 15% inline', () => expect(splitFee(100, 15)).toEqual({ net: 85, fee: 15 }));
  it('net + fee always equals gross', () => {
    for (const g of [0.01, 1.07, 33.33, 265.62, 9999.99]) {
      const { net, fee } = splitFee(g, 15);
      expect(Math.round((net + fee) * 100)).toBe(Math.round(g * 100));
    }
  });
});
