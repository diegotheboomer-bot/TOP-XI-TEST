import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { clipperTier } from '@/lib/clipper-records';
import { exchangeDiscordCode, getDiscordUser, syncDiscordMember } from '@/lib/discord';
import { appUrl } from '@/lib/env';
import { finishOAuth } from '@/lib/oauth-popup';

export async function GET(req: NextRequest) {
  const back = (status: string) => finishOAuth(req, `${appUrl()}/account?discord=${status}`);
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('discord_oauth_state')?.value) return back('error');

  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);

  const admin = createAdminClient();
  try {
    const token = await exchangeDiscordCode(code);
    const user = await getDiscordUser(token);
    const { error } = await admin.from('creators').update({ discord_id: user.id, discord_username: user.global_name ?? user.username }).eq('id', viewer.creatorId);
    if (error) return back(error.code === '23505' ? 'already_linked' : 'error');
    const [{ data: me }, tier] = await Promise.all([admin.from('creators').select('founder_number').eq('id', viewer.creatorId).single(), clipperTier(admin, viewer.creatorId)]);
    await syncDiscordMember(user.id, { tier, founder: !!me?.founder_number }, token);
  } catch {
    return back('error');
  }
  const res = back('connected');
  res.cookies.delete({ name: 'discord_oauth_state', path: '/api/oauth/discord' });
  return res;
}
