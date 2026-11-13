import { requireEnv, appUrl } from '../env';
import type { VideoStats } from './tiktok';

// Instagram API with Unified Login (built on Facebook Login for Business). New Meta apps can't use
// the older "Instagram Login", so clippers log in with Instagram or Facebook through this dialog.
// https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started
// https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
// INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are the Meta app's ID and secret (App settings → Basic).
const AUTH_URL = 'https://www.facebook.com/dialog/oauth';
const VERSION = 'v27.0';
const GRAPH = `https://graph.facebook.com/${VERSION}`;
/** The login configuration from the App Dashboard (not a secret). */
const CONFIG_ID = () => process.env.INSTAGRAM_CONFIG_ID?.trim() || '1134912728946286';
export const INSTAGRAM_SCOPES = ['instagram_basic', 'instagram_manage_insights'];

export const instagramRedirectUri = () => `${appUrl()}/api/oauth/instagram/callback`;

export function instagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv('INSTAGRAM_APP_ID'),
    config_id: CONFIG_ID(),
    redirect_uri: instagramRedirectUri(),
    response_type: 'code',
    override_default_response_type: 'true',
    // Always offer both the Instagram and the Facebook login.
    prompt: 'login',
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

/** A connected Instagram account: the access token and the Instagram account it reads. */
export interface IgConnection {
  token: string;
  igUserId: string;
}

/** Code → Business Integration System User access token (expiry is set in the login configuration; ours never expires). */
export async function exchangeInstagramCode(code: string): Promise<{ accessToken: string; expiresIn: number | null }> {
  const t = await getJson<{ access_token: string; expires_in?: number }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({
      client_id: requireEnv('INSTAGRAM_APP_ID'),
      client_secret: requireEnv('INSTAGRAM_APP_SECRET'),
      redirect_uri: instagramRedirectUri(),
      code,
    })}`,
  );
  return { accessToken: t.access_token, expiresIn: t.expires_in ?? null };
}

/** The Instagram professional account the clipper shared (the first one if they shared several). */
export async function getInstagramUser(token: string): Promise<{ userId: string; username: string | null; followers: number | null }> {
  const list = await getJson<{ data: { id: string; username?: string }[] }>(
    `${GRAPH}/me/assigned_instagram_accounts?${new URLSearchParams({ fields: 'id,username', access_token: token })}`,
  );
  const acct = list.data?.[0];
  if (!acct) throw new Error('No Instagram account was shared.');
  const u = await getJson<{ username?: string; followers_count?: number }>(
    `${GRAPH}/${acct.id}?${new URLSearchParams({ fields: 'username,followers_count', access_token: token })}`,
  ).catch(() => ({}) as { username?: string; followers_count?: number });
  return { userId: acct.id, username: u.username ?? acct.username ?? null, followers: u.followers_count ?? null };
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
 * Stats for the given Reel shortcodes, looked up in the connected account's own
 * media, so a match also proves the Reel is theirs. Pages through up to
 * `maxPages` × 50 recent posts. Returns VideoStats with id = shortcode.
 */
export async function queryInstagramReels({ token, igUserId }: IgConnection, shortcodes: string[], maxPages = 10): Promise<VideoStats[]> {
  const wanted = new Set(shortcodes);
  const found = new Map<string, IgMedia>();
  let url: string | null = `${GRAPH}/${igUserId}/media?${new URLSearchParams({
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
      `${GRAPH}/${m.id}/insights?${new URLSearchParams({ metric: 'views', access_token: token })}`,
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
