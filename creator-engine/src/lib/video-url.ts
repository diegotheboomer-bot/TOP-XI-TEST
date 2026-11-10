import type { Platform } from './types';

export interface ParsedVideo {
  platform: Platform;
  videoId: string;
  /** Canonical URL rebuilt from the ID (drops tracking params). */
  canonicalUrl: string;
}

export type ParseResult =
  | { ok: true; video: ParsedVideo }
  | { ok: false; reason: 'invalid_url' | 'unsupported_host' | 'no_video_id' }
  | { ok: false; reason: 'needs_resolution'; shortUrl: string };

// Per-platform path patterns, matched against URL.pathname (query handled separately).
const TIKTOK_PATHS = [
  /^\/@[\w.-]*\/(?:video|photo)\/(\d{15,21})\/?$/, // tiktok.com/@user/video/7234… (or a photo post)
  /^\/video\/(\d{15,21})\/?$/, // tiktok.com/video/7234…
  /^\/v\/(\d{15,21})(?:\.html)?\/?$/, // m.tiktok.com/v/7234….html
  /^\/embed(?:\/v2)?\/(\d{15,21})\/?$/, // tiktok.com/embed/v2/7234…
  /^\/player\/v1\/(\d{15,21})\/?$/, // tiktok.com/player/v1/7234…
];
const TIKTOK_SHORT_PATH = /^\/(?:t\/)?[A-Za-z0-9]{5,16}\/?$/; // vm.tiktok.com/ZMabc/ · tiktok.com/t/ZTabc/

// Instagram's newer share links (instagram.com/share/reel/BAxyz/) redirect to the real /reel/{code}.
const INSTAGRAM_SHARE_PATH = /^\/share\/(?:reels?|p)\/[A-Za-z0-9_-]{5,40}\/?$/;
const INSTAGRAM_PATHS = [
  /^\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,40})\/?$/, // /reel/{code} · /{user}/reel/{code} · /p/{code}
];

const YT_ID = '([A-Za-z0-9_-]{11})';
const YOUTUBE_PATHS = [new RegExp(`^/shorts/${YT_ID}/?$`), new RegExp(`^/(?:embed|live)/${YT_ID}/?$`)];

const host = (h: string) => h.toLowerCase().replace(/^(www\.|m\.)/, '');

export function parseVideoUrl(input: string): ParseResult {
  // Share sheets often paste text around the link ("Check this out! https://…"): use the first URL.
  const raw = input.trim().match(/https?:\/\/\S+/i)?.[0] ?? input.trim();
  let url: URL;
  try {
    url = new URL(raw.replace(/[).,!]+$/, ''));
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'invalid_url' };

  const h = host(url.hostname);
  const path = url.pathname;

  if (h === 'tiktok.com' || h === 'vm.tiktok.com' || h === 'vt.tiktok.com') {
    for (const re of TIKTOK_PATHS) {
      const m = path.match(re);
      if (m) return ok('tiktok', m[1], `https://www.tiktok.com/video/${m[1]}`);
    }
    const isShortHost = h !== 'tiktok.com';
    if ((isShortHost || path.startsWith('/t/')) && TIKTOK_SHORT_PATH.test(path)) {
      return { ok: false, reason: 'needs_resolution', shortUrl: url.toString() };
    }
    return { ok: false, reason: 'no_video_id' };
  }

  if (h === 'instagram.com') {
    if (INSTAGRAM_SHARE_PATH.test(path)) return { ok: false, reason: 'needs_resolution', shortUrl: url.toString() };
    for (const re of INSTAGRAM_PATHS) {
      const m = path.match(re);
      if (m) return ok('instagram', m[1], `https://www.instagram.com/reel/${m[1]}/`);
    }
    return { ok: false, reason: 'no_video_id' };
  }

  if (h === 'youtube.com' || h === 'youtu.be') {
    if (h === 'youtu.be') {
      const m = path.match(new RegExp(`^/${YT_ID}/?$`));
      if (m) return ok('youtube', m[1], `https://www.youtube.com/shorts/${m[1]}`);
      return { ok: false, reason: 'no_video_id' };
    }
    for (const re of YOUTUBE_PATHS) {
      const m = path.match(re);
      if (m) return ok('youtube', m[1], `https://www.youtube.com/shorts/${m[1]}`);
    }
    const v = url.searchParams.get('v');
    if (path === '/watch' && v && new RegExp(`^${YT_ID}$`).test(v)) {
      return ok('youtube', v, `https://www.youtube.com/shorts/${v}`);
    }
    return { ok: false, reason: 'no_video_id' };
  }

  return { ok: false, reason: 'unsupported_host' };
}

function ok(platform: Platform, videoId: string, canonicalUrl: string): ParseResult {
  return { ok: true, video: { platform, videoId, canonicalUrl } };
}

const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'www.tiktok.com', 'tiktok.com', 'm.tiktok.com', 'www.instagram.com', 'instagram.com']);

/**
 * Resolves share links (vm.tiktok.com/…, tiktok.com/t/…, instagram.com/share/…) by following
 * redirects manually, only ever to TikTok or Instagram hosts, then parses the final URL.
 * Tries HEAD first and falls back to GET, since some share hosts only redirect on GET.
 */
export async function parseVideoUrlResolving(input: string, fetchImpl: typeof fetch = fetch): Promise<ParseResult> {
  let result = parseVideoUrl(input);
  for (let hop = 0; hop < 4 && !result.ok && result.reason === 'needs_resolution'; hop++) {
    const headers = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' };
    let location: string | null = null;
    for (const method of ['HEAD', 'GET']) {
      try {
        const res = await fetchImpl(result.shortUrl, { method, redirect: 'manual', headers });
        location = res.headers.get('location');
      } catch {
        location = null;
      }
      if (location) break;
    }
    if (!location) return { ok: false, reason: 'no_video_id' };
    const next = new URL(location, result.shortUrl);
    if (!SHORT_HOSTS.has(next.hostname.toLowerCase()) && host(next.hostname) !== 'tiktok.com' && host(next.hostname) !== 'instagram.com') {
      return { ok: false, reason: 'unsupported_host' };
    }
    result = parseVideoUrl(next.toString());
  }
  return result;
}
