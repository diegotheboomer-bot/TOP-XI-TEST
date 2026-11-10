import { requireEnv } from '../env';
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
}

export async function getYouTubeChannel(ref: ChannelRef): Promise<YouTubeChannel | null> {
  const params = new URLSearchParams({ part: 'snippet,statistics', key: requireEnv('YOUTUBE_API_KEY') });
  if ('id' in ref) params.set('id', ref.id);
  else if ('handle' in ref) params.set('forHandle', ref.handle);
  else params.set('forUsername', ref.username);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`YouTube API: ${json.error?.message ?? res.status}`);
  const c = json.items?.[0] as { id: string; snippet?: { title?: string; description?: string }; statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } } | undefined;
  if (!c) return null;
  const subs = c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount ?? NaN);
  return { id: c.id, title: c.snippet?.title ?? '', description: c.snippet?.description ?? '', subscribers: Number.isFinite(subs) ? subs : null };
}
