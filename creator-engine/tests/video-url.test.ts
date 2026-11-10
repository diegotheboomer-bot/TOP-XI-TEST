import { describe, expect, it } from 'vitest';
import { parseVideoUrl, parseVideoUrlResolving } from '@/lib/video-url';

const id = '7312345678901234567';

describe('parseVideoUrl', () => {
  it.each([
    [`https://www.tiktok.com/@maya.makes/video/${id}`, id],
    [`https://www.tiktok.com/@maya_makes/video/${id}?is_from_webapp=1&sender_device=pc`, id],
    [`https://m.tiktok.com/v/${id}.html`, id],
    [`https://www.tiktok.com/embed/v2/${id}`, id],
    [`https://tiktok.com/@a/video/${id}/`, id],
  ])('TikTok %s', (url, expected) => {
    const r = parseVideoUrl(url);
    expect(r.ok && r.video).toEqual({ platform: 'tiktok', videoId: expected, canonicalUrl: `https://www.tiktok.com/video/${expected}` });
  });

  it.each([
    ['https://www.instagram.com/reel/C1a2B3c4D5e/', 'C1a2B3c4D5e'],
    ['https://instagram.com/reels/C1a2B3c4D5e', 'C1a2B3c4D5e'],
    ['https://www.instagram.com/maya.makes/reel/C1a2B3c4D5e/?igsh=abc', 'C1a2B3c4D5e'],
    ['https://www.instagram.com/p/C1a2B3c4D5e/', 'C1a2B3c4D5e'],
  ])('Instagram %s', (url, expected) => {
    const r = parseVideoUrl(url);
    expect(r.ok && r.video.platform).toBe('instagram');
    expect(r.ok && r.video.videoId).toBe(expected);
  });

  it.each([
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=3', 'dQw4w9WgXcQ'],
  ])('YouTube %s', (url, expected) => {
    const r = parseVideoUrl(url);
    expect(r.ok && r.video.platform).toBe('youtube');
    expect(r.ok && r.video.videoId).toBe(expected);
  });

  it('flags TikTok share links for resolution', () => {
    expect(parseVideoUrl('https://vm.tiktok.com/ZMabc123/')).toMatchObject({ ok: false, reason: 'needs_resolution' });
    expect(parseVideoUrl('https://www.tiktok.com/t/ZTRabc12/')).toMatchObject({ ok: false, reason: 'needs_resolution' });
  });

  it.each([
    ['not a url', 'invalid_url'],
    ['javascript:alert(1)', 'invalid_url'],
    ['https://example.com/@a/video/7312345678901234567', 'unsupported_host'],
    ['https://tiktok.com.evil.io/@a/video/7312345678901234567', 'unsupported_host'],
    ['https://www.tiktok.com/@maya.makes', 'no_video_id'],
    ['https://www.tiktok.com/@a/video/123', 'no_video_id'],
    ['https://www.youtube.com/shorts/short', 'no_video_id'],
    ['https://www.instagram.com/maya.makes/', 'no_video_id'],
  ])('rejects %s', (url, reason) => {
    expect(parseVideoUrl(url)).toMatchObject({ ok: false, reason });
  });
});

describe('parseVideoUrlResolving', () => {
  const redirectTo = (location: string) => (async () => new Response(null, { status: 301, headers: { location } })) as unknown as typeof fetch;

  it('follows a share link to the full video URL', async () => {
    const r = await parseVideoUrlResolving('https://vm.tiktok.com/ZMabc123/', redirectTo(`https://www.tiktok.com/@maya/video/${id}?_r=1`));
    expect(r.ok && r.video.videoId).toBe(id);
  });

  it('refuses redirects off TikTok', async () => {
    const r = await parseVideoUrlResolving('https://vm.tiktok.com/ZMabc123/', redirectTo('https://evil.example/@a/video/1'));
    expect(r).toMatchObject({ ok: false, reason: 'unsupported_host' });
  });
});

describe('share-sheet links', () => {
  it('reads a link with text around it', () => {
    const r = parseVideoUrl(`Check this out! https://www.tiktok.com/@maya/video/${id}?is_from_webapp=1 #fyp`);
    expect(r.ok && r.video.videoId).toBe(id);
  });
  it('reads a TikTok link without a username', () => {
    expect(parseVideoUrl(`https://www.tiktok.com/@/video/${id}`).ok).toBe(true);
  });
  it('reads a TikTok photo post', () => {
    expect(parseVideoUrl(`https://www.tiktok.com/@maya/photo/${id}`).ok).toBe(true);
  });
  it('follows an Instagram share link', async () => {
    const f = (async () => new Response(null, { status: 302, headers: { location: 'https://www.instagram.com/reel/DAbc123xyz/' } })) as unknown as typeof fetch;
    const r = await parseVideoUrlResolving('https://www.instagram.com/share/reel/BAxyz12345/', f);
    expect(r.ok && r.video.videoId).toBe('DAbc123xyz');
  });
  it('falls back to GET when HEAD has no redirect', async () => {
    const f = (async (_u: string, init?: RequestInit) =>
      init?.method === 'GET' ? new Response(null, { status: 301, headers: { location: `https://www.tiktok.com/@maya/video/${id}` } }) : new Response(null, { status: 200 })) as unknown as typeof fetch;
    const r = await parseVideoUrlResolving('https://vm.tiktok.com/ZMabc123/', f);
    expect(r.ok && r.video.videoId).toBe(id);
  });
});
