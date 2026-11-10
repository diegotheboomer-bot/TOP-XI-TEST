import { requireEnv, appUrl } from '../env';
import type { VideoStats } from './tiktok';

// Instagram API with Instagram Login (professional accounts: Creator or Business).
// https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
// https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const GRAPH = 'https://graph.instagram.com';
const VERSION = 'v27.0';
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'];

export const instagramRedirectUri = () => `${appUrl()}/api/oauth/instagram/callback`;

export function instagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('INSTAGRAM_APP_ID'),
    redirect_uri: instagramRedirectUri(),
    response_type: 'code',
    scope: INSTAGRAM_SCOPES.join(','),
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Instagram API: ${json.error?.message ?? json.error_message ?? res.status}`);
  return json as T;
}

/** Code → short-lived token → long-lived token (about 60 days). */
export async function exchangeInstagramCode(code: string): Promise<{ accessToken: string; expiresIn: number; userId: string; permissions: string[] }> {
  const short = await getJson<{ data?: { access_token: string; user_id: string | number; permissions: string }[]; access_token?: string; user_id?: string | number; permissions?: string | string[] }>(
    'https://api.instagram.com/oauth/access_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: requireEnv('INSTAGRAM_APP_ID'),
        client_secret: requireEnv('INSTAGRAM_APP_SECRET'),
        grant_type: 'authorization_code',
        redirect_uri: instagramRedirectUri(),
        code: code.replace(/#_$/, ''),
      }),
    },
  );
  const row = short.data?.[0] ?? short;
  const perms = row.permissions ?? '';
  const long = await getJson<{ access_token: string; expires_in: number }>(
    `${GRAPH}/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: requireEnv('INSTAGRAM_APP_SECRET'), access_token: row.access_token! })}`,
  );
  return { accessToken: long.access_token, expiresIn: long.expires_in, userId: String(row.user_id), permissions: Array.isArray(perms) ? perms : perms.split(',') };
}

/** A long-lived token can be refreshed once it's a day old and not yet expired. */
export async function refreshInstagramToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
  const t = await getJson<{ access_token: string; expires_in: number }>(`${GRAPH}/refresh_access_token?${new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token })}`);
  return { accessToken: t.access_token, expiresIn: t.expires_in };
}

export async function getInstagramUser(token: string): Promise<{ userId: string; username: string | null; followers: number | null; accountType: string | null }> {
  const u = await getJson<{ user_id?: string; id?: string; username?: string; followers_count?: number; account_type?: string }>(
    `${GRAPH}/${VERSION}/me?${new URLSearchParams({ fields: 'user_id,username,followers_count,account_type', access_token: token })}`,
  );
  return { userId: String(u.user_id ?? u.id), username: u.username ?? null, followers: u.followers_count ?? null, accountType: u.account_type ?? null };
}

interface IgMedia {
  id: string;
  shortcode?: string;
  timestamp?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  media_product_type?: string;
  thumbnail_url?: string;
  media_url?: string;
}

/**
 * Stats for the given Reel shortcodes, looked up in the token owner's own
 * media, so a match also proves the Reel is theirs. Pages through up to
 * `maxPages` × 50 recent posts. Returns VideoStats with id = shortcode.
 */
export async function queryInstagramReels(token: string, shortcodes: string[], maxPages = 10): Promise<VideoStats[]> {
  const wanted = new Set(shortcodes);
  const found = new Map<string, IgMedia>();
  let url: string | null = `${GRAPH}/${VERSION}/me/media?${new URLSearchParams({
    fields: 'id,shortcode,timestamp,caption,like_count,comments_count,media_product_type,thumbnail_url,media_url',
    limit: '50',
    access_token: token,
  })}`;
  for (let page = 0; url && page < maxPages && found.size < wanted.size; page++) {
    const res: { data: IgMedia[]; paging?: { next?: string } } = await getJson(url);
    for (const m of res.data ?? []) if (m.shortcode && wanted.has(m.shortcode)) found.set(m.shortcode, m);
    url = res.paging?.next ?? null;
  }
  const out: VideoStats[] = [];
  for (const [shortcode, m] of found) {
    const insights = await getJson<{ data: { name: string; values: { value: number }[] }[] }>(
      `${GRAPH}/${VERSION}/${m.id}/insights?${new URLSearchParams({ metric: 'views', access_token: token })}`,
    ).catch(() => ({ data: [] }));
    const views = insights.data.find((d) => d.name === 'views')?.values?.[0]?.value ?? 0;
    out.push({
      id: shortcode,
      views,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      shares: 0,
      coverUrl: m.thumbnail_url ?? (m.media_product_type === 'REELS' ? null : (m.media_url ?? null)),
      caption: m.caption ?? null,
      publishedAt: m.timestamp ? new Date(m.timestamp).toISOString() : null,
    });
  }
  return out;
}
