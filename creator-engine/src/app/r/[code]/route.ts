import { NextResponse, type NextRequest } from 'next/server';
import { REFERRAL_COOKIE, isSelfInvite, signupFingerprint, validCode } from '@/lib/referrals';
import { DEVICE_COOKIE, deviceHash } from '@/lib/device';
import { appUrl } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Invite link (atlasclipping.com/r/CODE): remembers who invited them, then opens clipper sign-up.
 * Opened by the inviter themselves (signed in as them, on a device they've used, or from their
 * sign-up network), it isn't remembered and they're told why.
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const base = appUrl().replace(/\/$/, '');
  const code = params.code.trim().toUpperCase();
  if (!validCode(code)) return NextResponse.redirect(`${base}/signup?role=creator`);
  const viewer = await getViewer().catch(() => null);
  const own = await isSelfInvite(createAdminClient(), code, {
    ip: signupFingerprint(req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')),
    device: deviceHash(req.cookies.get(DEVICE_COOKIE)?.value),
    viewerUserId: viewer?.userId,
  }).catch(() => false);
  if (own) {
    const res = NextResponse.redirect(viewer ? `${base}/${viewer.brandId ? 'streamer' : 'clipper'}/invite?own=1` : `${base}/signup?role=creator&invite=own`);
    res.cookies.delete(REFERRAL_COOKIE);
    return res;
  }
  const res = NextResponse.redirect(`${base}/signup?role=creator`);
  res.cookies.set(REFERRAL_COOKIE, code, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 86_400 });
  return res;
}
