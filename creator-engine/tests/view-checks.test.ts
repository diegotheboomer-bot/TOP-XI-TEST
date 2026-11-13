import { describe, expect, it } from 'vitest';
import { assessViews, type StatsSample } from '@/lib/fraud';

const t0 = Date.parse('2026-11-01T00:00:00Z');
const s = (hours: number, views: number, likes: number, comments: number, shares = 0): StatsSample => ({ capturedAt: new Date(t0 + hours * 3_600_000), views, likes, comments, shares });

describe('assessViews', () => {
  it('lets organic growth through: views and engagement grow together, fast then slower', () => {
    const r = assessViews([s(0, 2_000, 160, 12, 8), s(4, 40_000, 3_100, 240, 150), s(8, 70_000, 5_300, 410, 260), s(12, 85_000, 6_400, 500, 310)], { hasShares: true });
    expect(r.level).toBe('ok');
  });

  it('holds a hollow jump for review: +60K views with almost no new likes or comments', () => {
    const r = assessViews([s(0, 3_000, 240, 20), s(4, 5_000, 400, 31), s(8, 65_000, 420, 32)]);
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.reasons.join(' ')).toMatch(/new views since the last check/);
  });

  it('calls it fraud when the hollow jump also came out of nowhere', () => {
    const r = assessViews([s(0, 3_000, 240, 20), s(4, 3_400, 270, 22), s(8, 90_000, 290, 23)]);
    expect(r.level).toBe('fraud');
    expect(r.reasons.join(' ')).toMatch(/faster than before/);
  });

  it('still catches the original 5-minute bot burst', () => {
    const r = assessViews([{ capturedAt: new Date(t0), views: 1_000, likes: 50, comments: 5, shares: 0 }, { capturedAt: new Date(t0 + 4 * 60_000), views: 13_000, likes: 50, comments: 5, shares: 0 }]);
    expect(r.level).toBe('fraud');
  });

  it('holds low engagement overall, bought likes and comment bots for review', () => {
    expect(assessViews([s(0, 30_000, 40, 10)]).level).toBe('review');
    expect(assessViews([s(0, 10_000, 4_000, 50)]).level).toBe('review');
    expect(assessViews([s(0, 8_000, 120, 300)]).level).toBe('review');
  });

  it('holds a clip whose views went down a lot (the platform removed fake views)', () => {
    expect(assessViews([s(0, 50_000, 3_000, 200), s(4, 30_000, 3_000, 200)]).level).toBe('review');
  });

  it('does not re-raise ratios the business already approved, but still catches new jumps', () => {
    expect(assessViews([s(0, 30_000, 40, 10)], { cleared: true }).level).toBe('ok');
    const jump = assessViews([s(0, 30_000, 40, 10), s(4, 31_000, 41, 10), s(8, 120_000, 45, 10)], { cleared: true });
    expect(jump.level).not.toBe('ok');
  });
});
