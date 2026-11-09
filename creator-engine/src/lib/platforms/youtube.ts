import { requireEnv } from '../env';
import type { VideoStats } from './tiktok';

// YouTube Data API v3, videos.list: public statistics with an API key.
// https://developers.google.com/youtube/v3/docs/videos/list
const API = 'https://www.googleapis.com/youtube/v3/videos';

interface YouTubeVideo {
  id: string;
  snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string } } };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

/**
 * Fetches stats for up to 50 videos per request. There is no owner check here:
 * ownership is proven by the clipper's code in the title or description.
 * `caption` is title + description, for the code and #ad checks.
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
      });
    }
  }
  return out;
}
