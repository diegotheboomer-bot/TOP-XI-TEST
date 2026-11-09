import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getViewer } from '@/lib/session';
import { tiktokAuthorizeUrl } from '@/lib/platforms/tiktok';
import { appUrl } from '@/lib/env';

export async function GET() {
  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);

  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(tiktokAuthorizeUrl(state));
  res.cookies.set('tiktok_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/oauth/tiktok' });
  return res;
}
