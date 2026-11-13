import { requireEnv, appUrl } from '../env';

// TikTok Login Kit + Display API (v2). https://developers.tiktok.com/doc/login-kit-web
const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const API = 'https://open.tiktokapis.com/v2';
export const TIKTOK_SCOPES = ['user.info.basic', 'user.info.stats', 'video.list'];

export const tiktokRedirectUri = () => `${appUrl()}/api/oauth/tiktok/callback`;

export function tiktokAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: requireEnv('TIKTOK_CLIENT_KEY'),
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: tiktokRedirectUri(),
    // Always show TikTok's screen, so someone can switch accounts.
    disable_auto_auth: '1',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

export interface TikTokTokens {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TikTokTokens> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: requireEnv('TIKTOK_CLIENT_KEY'),
      client_secret: requireEnv('TIKTOK_CLIENT_SECRET'),
      ...body,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`TikTok token error: ${json.error_description ?? json.error ?? res.status}`);
  return json as TikTokTokens;
}

export const exchangeTikTokCode = (code: string) =>
  tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: tiktokRedirectUri() });

export const refreshTikTokToken = (refreshToken: string) =>
  tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });

async function apiCall<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok || (json.error && json.error.code !== 'ok')) {
    throw new Error(`TikTok API ${path}: ${json.error?.code ?? res.status} ${json.error?.message ?? ''}`.trim());
  }
  return json.data as T;
}

export async function getTikTokUser(accessToken: string) {
  const data = await apiCall<{ user: { open_id: string; display_name?: string; follower_count?: number; avatar_url?: string } }>(
    '/user/info/?fields=open_id,display_name,follower_count,avatar_url',
    accessToken,
  );
  return data.user;
}

export interface VideoStats {
  id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  coverUrl: string | null;
  caption: string | null;
  /** When it was posted, if the platform says. */
  publishedAt?: string | null;
  /** YouTube only: the channel it's on. */
  channelId?: string | null;
}

/**
 * Query Videos only returns videos owned by the token's user — so a match
 * also proves the creator owns the submitted video. Max 20 IDs per call.
 */
export async function queryTikTokVideos(accessToken: string, videoIds: string[]): Promise<VideoStats[]> {
  const out: VideoStats[] = [];
  for (let i = 0; i < videoIds.length; i += 20) {
    const data = await apiCall<{
      videos: { id: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number; cover_image_url?: string; video_description?: string; create_time?: number }[];
    }>('/video/query/?fields=id,view_count,like_count,comment_count,share_count,cover_image_url,video_description,create_time', accessToken, {
      method: 'POST',
      body: JSON.stringify({ filters: { video_ids: videoIds.slice(i, i + 20) } }),
    });
    for (const v of data.videos ?? []) {
      out.push({
        id: v.id,
        views: v.view_count ?? 0,
        likes: v.like_count ?? 0,
        comments: v.comment_count ?? 0,
        shares: v.share_count ?? 0,
        coverUrl: v.cover_image_url ?? null,
        caption: v.video_description ?? null,
        publishedAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
      });
    }
  }
  return out;
}
