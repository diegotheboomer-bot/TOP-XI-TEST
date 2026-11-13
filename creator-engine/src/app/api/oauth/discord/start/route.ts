import { NextResponse, type NextRequest } from 'next/server';
import { rememberPopup } from '@/lib/oauth-popup';
import { randomBytes } from 'node:crypto';
import { getViewer } from '@/lib/session';
import { discordAuthorizeUrl, discordConfigured } from '@/lib/discord';
import { appUrl } from '@/lib/env';

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);
  if (!discordConfigured()) return NextResponse.redirect(`${appUrl()}/account?discord=unavailable`);
  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(discordAuthorizeUrl(state));
  res.cookies.set('discord_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/oauth/discord' });
  return rememberPopup(req, res);
}
