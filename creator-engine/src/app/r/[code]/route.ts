import { NextResponse, type NextRequest } from 'next/server';
import { REFERRAL_COOKIE, validCode } from '@/lib/referrals';
import { appUrl } from '@/lib/env';

/** Invite link (atlasclipping.com/r/CODE): remembers who invited them, then opens clipper sign-up. */
export function GET(_request: NextRequest, { params }: { params: { code: string } }) {
  const res = NextResponse.redirect(new URL('/signup?role=creator', appUrl()));
  const code = params.code.trim().toUpperCase();
  if (validCode(code)) res.cookies.set(REFERRAL_COOKIE, code, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 86_400 });
  return res;
}
