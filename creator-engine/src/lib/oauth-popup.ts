import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from './env';

// Connect buttons open the provider's sign-in in a popup (?popup=1 on the start route).
// The callback then lands on /oauth/done, which tells the page that opened it and closes.
const COOKIE = 'atlas_oauth_popup';

/** On a start route: remember that this sign-in runs in a popup. */
export function rememberPopup(req: NextRequest, res: NextResponse): NextResponse {
  if (req.nextUrl.searchParams.get('popup') === '1') res.cookies.set(COOKIE, '1', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}

/** On a callback: go to `target`, or hand it to the opener page when this is a popup. */
export function finishOAuth(req: NextRequest, target: string): NextResponse {
  if (req.cookies.get(COOKIE)?.value !== '1') return NextResponse.redirect(target);
  const u = new URL(target, appUrl());
  const res = NextResponse.redirect(`${appUrl()}/oauth/done?to=${encodeURIComponent(u.pathname + u.search)}`);
  res.cookies.delete({ name: COOKIE, path: '/' });
  return res;
}
