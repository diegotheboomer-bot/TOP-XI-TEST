import { describe, expect, it } from 'vitest';
import { calculatePayout } from '@/lib/payout';
import { CampaignSchema } from '@/lib/schemas';

const terms = { payout_model: 'pure_cpm' as const, base_payout: 0, cpm_rate: 2, cpm_cap: 100, cps_commission_pct: 0, min_payout: 5 };

describe('min payout', () => {
  it('pays nothing below the minimum', () => expect(calculatePayout(terms, 2_000)).toBe(0));
  it('pays in full once the minimum is reached', () => expect(calculatePayout(terms, 2_500)).toBe(5));
  it('still stops at the max', () => expect(calculatePayout(terms, 1_000_000)).toBe(100));
});

describe('references', () => {
  const base = { title: 'Test', payout_model: 'pure_cpm', base_payout: '0', cpm_rate: '2', cpm_cap: '100', cps_commission_pct: '0', code_prefix: 'TEST', asset_folder_url: '', platforms: ['tiktok'] };
  it('accepts links and files', () => {
    const r = CampaignSchema.safeParse({ ...base, reference_items: JSON.stringify([{ kind: 'video', url: 'https://x.co/a.mp4', name: 'a.mp4' }]) });
    expect(r.success && r.data.reference_items).toHaveLength(1);
  });
  it('rejects a min above the max', () => {
    expect(CampaignSchema.safeParse({ ...base, min_payout: '200' }).success).toBe(false);
  });
});
