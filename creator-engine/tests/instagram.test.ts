import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryInstagramReels } from '@/lib/platforms/instagram';

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('queryInstagramReels', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('finds Reels by shortcode across pages, reads their views, ignores others', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/17841/media') && !url.includes('after=2')) {
        return json({ data: [{ id: '1', shortcode: 'AAA', like_count: 5, comments_count: 1, media_product_type: 'REELS', timestamp: '2026-11-01T10:00:00+0000' }], paging: { next: 'https://graph.facebook.com/v27.0/17841/media?after=2' } });
      }
      if (url.includes('after=2')) return json({ data: [{ id: '2', shortcode: 'BBB', like_count: 9, comments_count: 0, media_product_type: 'REELS' }] });
      if (url.includes('/1/insights')) return json({ data: [{ name: 'views', values: [{ value: 1200 }] }] });
      if (url.includes('/2/insights')) return json({ data: [{ name: 'views', values: [{ value: 40 }] }] });
      throw new Error(`unexpected ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const out = await queryInstagramReels({ token: 'tok', igUserId: '17841' }, ['BBB', 'AAA', 'NOTMINE']);
    expect(out.map((v) => [v.id, v.views, v.likes]).sort()).toEqual([
      ['AAA', 1200, 5],
      ['BBB', 40, 9],
    ]);
    expect(out.find((v) => v.id === 'AAA')?.publishedAt).toBe('2026-11-01T10:00:00.000Z');
  });
});
