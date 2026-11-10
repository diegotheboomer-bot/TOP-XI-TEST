import { describe, expect, it } from 'vitest';
import { detectLowEngagement, LOW_ENGAGEMENT_MIN_VIEWS } from '@/lib/fraud';

describe('detectLowEngagement', () => {
  it('holds a big clip with almost no likes or comments (looks paid-promoted)', () => {
    expect(detectLowEngagement({ views: 50_000, likes: 80, comments: 10 }).flagged).toBe(true);
  });

  it('leaves normal clips alone', () => {
    expect(detectLowEngagement({ views: 50_000, likes: 2_500, comments: 120 }).flagged).toBe(false);
  });

  it('ignores small clips, where a few likes swing the ratio', () => {
    expect(detectLowEngagement({ views: LOW_ENGAGEMENT_MIN_VIEWS - 1, likes: 0, comments: 0 }).flagged).toBe(false);
  });

  it('does not divide by zero', () => {
    expect(detectLowEngagement({ views: 0, likes: 0, comments: 0 })).toEqual({ flagged: false, ratio: 0 });
  });
});
