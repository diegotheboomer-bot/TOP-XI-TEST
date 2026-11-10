import { describe, expect, it } from 'vitest';
import { calculatePayout, poolShares } from '@/lib/payout';
import { CampaignSchema, campaignInput } from '@/lib/schemas';

const terms = { base_payout: 0, cpm_rate: 0, cpm_cap: 1_000_000, cps_commission_pct: 0 };

describe('per post', () => {
  it('pays the flat amount whatever the views', () => {
    expect(calculatePayout({ ...terms, payout_model: 'per_post', base_payout: 20, cpm_cap: 20 }, 0)).toBe(20);
    expect(calculatePayout({ ...terms, payout_model: 'per_post', base_payout: 20, cpm_cap: 20 }, 1_000_000)).toBe(20);
  });
});

describe('pool', () => {
  it('splits by share of views and never pays out more than the pool', () => {
    const s = poolShares(100, [
      { id: 'a', views: 600 },
      { id: 'b', views: 300 },
      { id: 'c', views: 100 },
    ]);
    expect([s.get('a'), s.get('b'), s.get('c')]).toEqual([60, 30, 10]);
    const odd = poolShares(10, [
      { id: 'a', views: 1 },
      { id: 'b', views: 1 },
      { id: 'c', views: 1 },
    ]);
    expect([...odd.values()].reduce((n, v) => n + v, 0)).toBeLessThanOrEqual(10);
  });
  it('pays nothing while no clip has views', () => {
    expect(poolShares(100, [{ id: 'a', views: 0 }]).get('a')).toBe(0);
  });
});

describe('campaign form', () => {
  const form = (extra: Record<string, string | string[]>) => {
    const f = new FormData();
    const base: Record<string, string | string[]> = { title: 'Test run', code_prefix: 'TEST', asset_folder_url: '', cps_commission_pct: '0', platforms: ['tiktok'], ...extra };
    for (const [k, v] of Object.entries(base)) for (const x of [v].flat()) f.append(k, x);
    return CampaignSchema.safeParse(campaignInput(f));
  };
  it('accepts per post, pool, content types and a category', () => {
    expect(form({ payout_model: 'per_post', base_payout: '20', cpm_rate: '0', cpm_cap: '20', content_types: ['clipping', 'meme'], category: 'Gaming' }).success).toBe(true);
    expect(form({ payout_model: 'pool', base_payout: '0', cpm_rate: '0', cpm_cap: '1000000' }).success).toBe(true);
  });
  it('rejects a per-post campaign with no amount', () => {
    expect(form({ payout_model: 'per_post', base_payout: '0', cpm_rate: '0', cpm_cap: '1' }).success).toBe(false);
  });
});
