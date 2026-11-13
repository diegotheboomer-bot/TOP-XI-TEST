import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { JOIN_COOKIE, validJoinKey } from '@/lib/private-link';

/**
 * A private campaign's link. A signed-in clipper gets access straight away (recorded as an
 * accepted invite, which is what lets them see and join it). Anyone else signs up first;
 * the link is remembered and finished on their first visit to the clipper home.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const base = appUrl().replace(/\/$/, '');
  const key = req.nextUrl.searchParams.get('k');
  if (!validJoinKey(params.id, key)) return NextResponse.redirect(`${base}/clipper/discover`);

  const viewer = await getViewer();
  if (!viewer) {
    const res = NextResponse.redirect(`${base}/signup?role=creator`);
    res.cookies.set(JOIN_COOKIE, `${params.id}.${key}`, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 7 * 86_400 });
    return res;
  }
  if (!viewer.creatorId) return NextResponse.redirect(`${base}/streamer`);

  const admin = createAdminClient();
  const { data: campaign } = await admin.from('campaigns').select('id').eq('id', params.id).maybeSingle();
  if (campaign) {
    await admin.from('campaign_invites').upsert({ campaign_id: params.id, creator_id: viewer.creatorId, status: 'accepted', message: 'Joined with the private link' }, { onConflict: 'campaign_id,creator_id', ignoreDuplicates: true });
  }
  const res = NextResponse.redirect(`${base}/clipper/campaigns/${params.id}`);
  res.cookies.delete(JOIN_COOKIE);
  return res;
}
