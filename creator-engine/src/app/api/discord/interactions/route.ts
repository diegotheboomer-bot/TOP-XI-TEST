// Discord sends button and menu clicks from the #verify channel here (the app's
// Interactions Endpoint URL), so the server needs no always-on bot. Each request is
// signed by Discord and checked with the app's public key before anything happens.
import { createPublicKey, verify } from 'node:crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The application's public key (Developer Portal → General Information). Public by design.
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim() || '44c99247d83b2d6c60b4c25f41d72fde42e01331a501a3d16042b0764c52b7c9';
const API = 'https://discord.com/api/v10';
const EPHEMERAL = 64;

const PLATFORMS: [string, string, string][] = [
  ['tiktok', 'TikTok', '🎵'],
  ['shorts', 'YouTube Shorts', '▶️'],
  ['reels', 'Instagram Reels', '📸'],
];
const NICHES: [string, string, string][] = [
  ['gaming', 'Gaming', '🎮'],
  ['irl', 'IRL', '🌍'],
  ['chatting', 'Just Chatting', '💬'],
  ['esports', 'Esports', '🏆'],
  ['music', 'Music', '🎧'],
  ['sports', 'Sports', '⚽'],
  ['comedy', 'Comedy', '😂'],
  ['education', 'Education', '📚'],
  ['movies', 'Movies & TV', '🎬'],
];
const PROMOTING: [string, string, string][] = [
  ['streamer', 'My streams', '🎮'],
  ['brand', 'A brand or product', '🛍️'],
  ['music', 'Music', '🎵'],
  ['film', 'A film, show or trailer', '🎬'],
  ['app', 'An app or game', '📱'],
  ['agency', 'Clients (agency)', '🏢'],
];

function signatureOk(body: string, sig: string | null, ts: string | null): boolean {
  if (!sig || !ts) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(PUBLIC_KEY, 'hex')]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(ts + body), key, Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

const bot = (method: string, path: string) =>
  fetch(API + path, { method, headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN?.trim() ?? ''}` } });

let roleCache: { at: number; ids: Map<string, string> } | null = null;
async function roleIds(guild: string): Promise<Map<string, string>> {
  if (roleCache && Date.now() - roleCache.at < 5 * 60_000) return roleCache.ids;
  const res = await bot('GET', `/guilds/${guild}/roles`);
  const ids = new Map(((await res.json()) as { id: string; name: string }[]).map((r) => [r.name, r.id]));
  roleCache = { at: Date.now(), ids };
  return ids;
}

/** Adds roles by name (missing names are skipped). */
async function give(guild: string, user: string, names: string[]) {
  const ids = await roleIds(guild);
  await Promise.all(names.map((n) => ids.get(n)).filter((id): id is string => !!id).map((id) => bot('PUT', `/guilds/${guild}/members/${user}/roles/${id}`)));
}

const row = (...components: object[]) => ({ type: 1, components });
const button = (custom_id: string, label: string, emoji: string, style = 2) => ({ type: 2, style, custom_id, label, emoji: { name: emoji } });
const menu = (custom_id: string, placeholder: string, options: [string, string, string][], max = options.length) => ({
  type: 3,
  custom_id,
  placeholder,
  min_values: 1,
  max_values: max,
  options: options.map(([value, label, emoji]) => ({ value, label, emoji: { name: emoji } })),
});
const reply = (content: string, components: object[] = []) => NextResponse.json({ type: 4, data: { content, components, flags: EPHEMERAL } });
const update = (content: string, components: object[] = []) => NextResponse.json({ type: 7, data: { content, components } });
const labels = (list: [string, string, string][], values: string[]) => list.filter(([v]) => values.includes(v)).map(([, l]) => l);

export async function POST(req: Request) {
  const body = await req.text();
  if (!signatureOk(body, req.headers.get('x-signature-ed25519'), req.headers.get('x-signature-timestamp'))) {
    return new NextResponse('invalid request signature', { status: 401 });
  }
  const i = JSON.parse(body) as { type: number; guild_id?: string; member?: { user: { id: string } }; data?: { custom_id?: string; values?: string[] } };
  if (i.type === 1) return NextResponse.json({ type: 1 }); // Discord's ping
  if (i.type !== 3 || !i.guild_id || !i.member) return NextResponse.json({ type: 4, data: { content: 'Not supported.', flags: EPHEMERAL } });

  const guild = i.guild_id;
  const user = i.member.user.id;
  const id = i.data?.custom_id ?? '';
  const values = i.data?.values ?? [];

  switch (id) {
    case 'verify:start':
      return reply('### 👋 Welcome to Atlas\n**What brings you here?**', [
        row(button('verify:clipper', 'I want to clip and get paid', '🎬', 1), button('verify:business', 'I want clips for my content or brand', '📈', 2)),
      ]);
    case 'verify:clipper':
      return update('### 🎬 Clipper\n**Where do you post?** Pick all that apply.', [row(menu('verify:platforms', 'Choose your platforms', PLATFORMS))]);
    case 'verify:platforms':
      await give(guild, user, labels(PLATFORMS, values));
      return update('### 🎬 Clipper\n**What do you like to clip?** We\'ll ping you when matching campaigns drop.', [row(menu('verify:niches', 'Choose your niches', NICHES))]);
    case 'verify:niches':
      await give(guild, user, ['Verified', 'Clipper', ...labels(NICHES, values)]);
      return update(
        '### ✅ You\'re in!\nThe whole server is unlocked. Next: **sign up on Atlas**, join a campaign and start earning. Link your Discord in Atlas Settings to get your tier role.',
        [row({ type: 2, style: 5, label: 'Open Atlas', url: 'https://atlasclipping.com/signup?role=creator', emoji: { name: '🚀' } })],
      );
    case 'verify:business':
      return update('### 📈 Business\n**What are you promoting?**', [row(menu('verify:promoting', 'Choose what you promote', PROMOTING))]);
    case 'verify:promoting':
      await give(guild, user, ['Verified', 'Business']);
      return update(
        `### ✅ You're in!\nPromoting: **${labels(PROMOTING, values).join(', ')}**. Read **#start-a-campaign** for the steps, or post in **#campaign-requests** and the team will help you launch.`,
        [row({ type: 2, style: 5, label: 'Launch a campaign', url: 'https://atlasclipping.com/start', emoji: { name: '🚀' } })],
      );
    default:
      return reply('That button has expired. Tap ✅ Verify in #verify again.');
  }
}
