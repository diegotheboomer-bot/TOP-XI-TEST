import { appUrl, requireEnv } from '../env';
import type { VideoStats } from './tiktok';

// YouTube Data API v3, videos.list: public statistics with an API key.
// https://developers.google.com/youtube/v3/docs/videos/list
const API = 'https://www.googleapis.com/youtube/v3/videos';

interface YouTubeVideo {
  id: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; channelId?: string; thumbnails?: { high?: { url?: string } } };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

/**
 * Fetches stats for up to 50 videos per request. `channelId` is checked against
 * the clipper's verified channel. `caption` is title + description.
 */
export async function getYouTubeVideos(ids: string[]): Promise<VideoStats[]> {
  const out: VideoStats[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({ part: 'snippet,statistics', id: ids.slice(i, i + 50).join(','), key: requireEnv('YOUTUBE_API_KEY') });
    const res = await fetch(`${API}?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(`YouTube API: ${json.error?.message ?? res.status}`);
    for (const v of (json.items ?? []) as YouTubeVideo[]) {
      out.push({
        id: v.id,
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
        shares: 0,
        coverUrl: v.snippet?.thumbnails?.high?.url ?? null,
        caption: [v.snippet?.title, v.snippet?.description].filter(Boolean).join('\n'),
        publishedAt: v.snippet?.publishedAt ?? null,
        channelId: v.snippet?.channelId ?? null,
      });
    }
  }
  return out;
}

// ── Channel verification ────────────────────────────────────────────────────
// A clipper proves a channel is theirs once by putting their verify code in
// the channel description; after that any Short from that channel counts.

export type ChannelRef = { id: string } | { handle: string } | { username: string };

/** youtube.com/@name, youtube.com/channel/UC…, youtube.com/user/name, or a bare @name. */
export function parseChannelInput(input: string): ChannelRef | null {
  const raw = input.trim();
  if (/^@[\w.-]{3,100}$/.test(raw)) return { handle: raw };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/i.test(url.hostname)) return null;
  const [first, second] = url.pathname.split('/').filter(Boolean);
  if (first?.startsWith('@')) return { handle: decodeURIComponent(first) };
  if (first === 'channel' && second && /^UC[\w-]{22}$/.test(second)) return { id: second };
  if (first === 'user' && second) return { username: second };
  return null;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscribers: number | null;
  /** Channel picture. */
  picture: string | null;
}

export async function getYouTubeChannel(ref: ChannelRef): Promise<YouTubeChannel | null> {
  const params = new URLSearchParams({ part: 'snippet,statistics', key: requireEnv('YOUTUBE_API_KEY') });
  if ('id' in ref) params.set('id', ref.id);
  else if ('handle' in ref) params.set('forHandle', ref.handle);
  else params.set('forUsername', ref.username);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`YouTube API: ${json.error?.message ?? res.status}`);
  const c = json.items?.[0] as { id: string; snippet?: { title?: string; description?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } } | undefined;
  if (!c) return null;
  const subs = c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? NaN);
  return { id: c.id, title: c.snippet?.title ?? '', description: c.snippet?.description ?? '', subscribers: Number.isFinite(subs) ? subs : null, picture: c.snippet?.thumbnails?.medium?.url ?? c.snippet?.thumbnails?.default?.url ?? null };
}

// ── Connect with Google ─────────────────────────────────────────────────────
// The clipper signs in with Google and picks their channel; channels.list?mine=true
// tells us which channel is theirs. Stats still come from the API key, so no token is kept.
// https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
const YT_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

/** On once YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET (Google Cloud OAuth client) are set. */
export const youtubeGoogleEnabled = () => !!process.env.YOUTUBE_CLIENT_ID?.trim() && !!process.env.YOUTUBE_CLIENT_SECRET?.trim();

export const youtubeRedirectUri = () => `${appUrl()}/api/oauth/youtube/callback`;

export function youtubeAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('YOUTUBE_CLIENT_ID'),
    redirect_uri: youtubeRedirectUri(),
    response_type: 'code',
    scope: YT_SCOPE,
    access_type: 'online',
    // Lets people with several Google accounts or brand channels pick the right one.
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Code → the signed-in person's YouTube channel (null if they have none). */
export async function getConnectedYouTubeChannel(code: string): Promise<YouTubeChannel | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireEnv('YOUTUBE_CLIENT_ID'),
      client_secret: requireEnv('YOUTUBE_CLIENT_SECRET'),
      redirect_uri: youtubeRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const tok = await res.json();
  if (!res.ok || !tok.access_token) throw new Error(`Google OAuth: ${tok.error_description ?? tok.error ?? res.status}`);
  const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({ part: 'snippet,statistics', mine: 'true' })}`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`YouTube API: ${json.error?.message ?? r.status}`);
  const c = json.items?.[0] as { id: string; snippet?: { title?: string; description?: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } } | undefined;
  if (!c) return null;
  const subs = c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? NaN);
  return { id: c.id, title: c.snippet?.title ?? '', description: c.snippet?.description ?? '', subscribers: Number.isFinite(subs) ? subs : null, picture: c.snippet?.thumbnails?.medium?.url ?? c.snippet?.thumbnails?.default?.url ?? null };
}
