import { NextResponse, type NextRequest } from 'next/server';
import { rememberPopup } from '@/lib/oauth-popup';
import { randomBytes } from 'node:crypto';
import { getViewer } from '@/lib/session';
import { youtubeAuthorizeUrl, youtubeGoogleEnabled } from '@/lib/platforms/youtube';
import { appUrl } from '@/lib/env';

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);
  if (!youtubeGoogleEnabled()) return NextResponse.redirect(`${appUrl()}/account?tab=connections`);
  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(youtubeAuthorizeUrl(state));
  res.cookies.set('youtube_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/oauth/youtube' });
  return rememberPopup(req, res);
}
