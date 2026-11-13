import { NextResponse, type NextRequest } from 'next/server';
import { rememberPopup } from '@/lib/oauth-popup';
import { randomBytes } from 'node:crypto';
import { getViewer } from '@/lib/session';
import { instagramAuthorizeUrl } from '@/lib/platforms/instagram';
import { appUrl } from '@/lib/env';

export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);
  const state = randomBytes(24).toString('base64url');
  const res = NextResponse.redirect(instagramAuthorizeUrl(state));
  res.cookies.set('instagram_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/oauth/instagram' });
  return rememberPopup(req, res);
}
