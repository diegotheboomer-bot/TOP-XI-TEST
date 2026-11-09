import { describe, expect, it } from 'vitest';
import { detectBotVelocity, hashSimilarity, DUPLICATE_THRESHOLD } from '@/lib/fraud';

const t0 = new Date('2026-01-01T00:00:00Z');
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

describe('detectBotVelocity', () => {
  it('flags +10k views in under 5 minutes with < 0.05% comments', () => {
    const r = detectBotVelocity({ capturedAt: t0, views: 1_000, comments: 5 }, { capturedAt: at(4), views: 13_000, comments: 5 });
    expect(r.flagged).toBe(true);
  });
  it('does not flag the same spike with healthy comments', () => {
    const r = detectBotVelocity({ capturedAt: t0, views: 1_000, comments: 5 }, { capturedAt: at(4), views: 13_000, comments: 200 });
    expect(r.flagged).toBe(false);
  });
  it('does not flag organic growth', () => {
    const r = detectBotVelocity({ capturedAt: t0, views: 1_000, comments: 0 }, { capturedAt: at(240), views: 60_000, comments: 10 });
    expect(r.flagged).toBe(false);
  });
  it('does not flag exactly 10k (rule is "more than")', () => {
    const r = detectBotVelocity({ capturedAt: t0, views: 0, comments: 0 }, { capturedAt: at(4), views: 10_000, comments: 0 });
    expect(r.flagged).toBe(false);
  });
  it('applies the same rate over longer intervals', () => {
    const r = detectBotVelocity({ capturedAt: t0, views: 0, comments: 0 }, { capturedAt: at(240), views: 500_000, comments: 100 });
    expect(r.viewsPerMinute).toBeGreaterThan(2000);
    expect(r.flagged).toBe(true);
  });
});

describe('hashSimilarity', () => {
  it('is 1 for identical hashes', () => expect(hashSimilarity('a1b2c3d4e5f60718', 'a1b2c3d4e5f60718')).toBe(1));
  it('3 differing bits is a duplicate, 4 is not', () => {
    expect(hashSimilarity('0000000000000000', '0000000000000007')).toBeGreaterThan(DUPLICATE_THRESHOLD);
    expect(hashSimilarity('0000000000000000', '000000000000000f')).toBeLessThan(DUPLICATE_THRESHOLD);
  });
});
