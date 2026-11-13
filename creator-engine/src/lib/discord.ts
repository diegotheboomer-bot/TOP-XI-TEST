// Atlas Discord: a clipper links their Discord account once, the Atlas bot adds them to the
// server and keeps their roles in step with Atlas (Clipper, their tier, Founder for the first 100).
// Needs DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.
import type { SupabaseClient } from '@supabase/supabase-js';
import { appUrl } from './env';
import { selectAll } from './fetch-all';
import { clipperRecords } from './clipper-records';
import { TIERS, TIER_LABEL, tierFor, type Tier } from './tiers';

const API = 'https://discord.com/api/v10';
const env = (k: string) => process.env[k]?.trim() ?? '';

export const discordConfigured = () => !!(env('DISCORD_CLIENT_ID') && env('DISCORD_CLIENT_SECRET') && env('DISCORD_BOT_TOKEN') && env('DISCORD_GUILD_ID'));
const redirectUri = () => `${appUrl()}/api/oauth/discord/callback`;

export function discordAuthorizeUrl(state: string): string {
  const q = new URLSearchParams({ client_id: env('DISCORD_CLIENT_ID'), response_type: 'code', redirect_uri: redirectUri(), scope: 'identify guilds.join', state, prompt: 'consent' });
  return `https://discord.com/oauth2/authorize?${q}`;
}

export async function exchangeDiscordCode(code: string): Promise<string> {
  const res = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: env('DISCORD_CLIENT_ID'), client_secret: env('DISCORD_CLIENT_SECRET') }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function getDiscordUser(accessToken: string): Promise<{ id: string; username: string; global_name: string | null }> {
  const res = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Discord user lookup failed (${res.status})`);
  return res.json();
}

/** A bot call, retried once on a rate limit. */
async function bot(method: string, path: string, body?: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bot ${env('DISCORD_BOT_TOKEN')}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 3) {
      const wait = Number((await res.json().catch(() => ({})))?.retry_after ?? 1);
      await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 100));
      continue;
    }
    return res;
  }
}

/** Role ids by name (Clipper, Founder, Silver … Majesty). */
async function roleIds(): Promise<Map<string, string>> {
  const res = await bot('GET', `/guilds/${env('DISCORD_GUILD_ID')}/roles`);
  if (!res.ok) throw new Error(`Discord roles lookup failed (${res.status})`);
  const roles = (await res.json()) as { id: string; name: string }[];
  return new Map(roles.map((r) => [r.name, r.id]));
}

/**
 * Puts the member in the server (when we have their OAuth token) and gives them exactly
 * the Atlas roles they've earned: Clipper, their tier and Founder. Other roles are untouched.
 */
export async function syncDiscordMember(discordId: string, standing: { tier: Tier; founder: boolean }, accessToken?: string, roles?: Map<string, string>): Promise<void> {
  const guild = env('DISCORD_GUILD_ID');
  const ids = roles ?? (await roleIds());
  const want = new Set([ids.get('Verified'), ids.get('Clipper'), ids.get(TIER_LABEL[standing.tier]), standing.founder ? ids.get('Founder') : undefined].filter((x): x is string => !!x));
  const managed = new Set([ids.get('Founder'), ...TIERS.map((t) => ids.get(TIER_LABEL[t]))].filter((x): x is string => !!x));

  if (accessToken) {
    // Joins them if they aren't in the server yet (204 if they already are).
    const join = await bot('PUT', `/guilds/${guild}/members/${discordId}`, { access_token: accessToken, roles: [...want] });
    if (!join.ok) throw new Error(`Couldn't add you to the Atlas Discord (${join.status})`);
  }
  const member = await bot('GET', `/guilds/${guild}/members/${discordId}`);
  if (member.status === 404) return; // left the server
  if (!member.ok) throw new Error(`Discord member lookup failed (${member.status})`);
  const has = new Set(((await member.json()) as { roles: string[] }).roles);
  for (const id of want) if (!has.has(id)) await bot('PUT', `/guilds/${guild}/members/${discordId}/roles/${id}`);
  for (const id of has) if (managed.has(id) && !want.has(id)) await bot('DELETE', `/guilds/${guild}/members/${discordId}/roles/${id}`);
}

/** Keeps every linked clipper's tier role current (run by the scheduled sync). */
export async function syncAllDiscordRoles(admin: SupabaseClient): Promise<number> {
  if (!discordConfigured()) return 0;
  const { data: linked } = await selectAll(() => admin.from('creators').select('id, discord_id, founder_number').not('discord_id', 'is', null).order('id'));
  if (!linked.length) return 0;
  const [records, roles] = await Promise.all([clipperRecords(admin, linked.map((c) => c.id as string)), roleIds()]);
  let done = 0;
  for (const c of linked) {
    try {
      await syncDiscordMember(c.discord_id as string, { tier: tierFor(records.get(c.id as string)!), founder: !!c.founder_number }, undefined, roles);
      done++;
    } catch {
      // One failure shouldn't stop the rest; it's retried on the next run.
    }
  }
  return done;
}
