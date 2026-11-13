import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeInstagramCode, getInstagramUser, INSTAGRAM_SCOPES } from '@/lib/platforms/instagram';
import { encryptSecret } from '@/lib/crypto';
import { appUrl } from '@/lib/env';

export async function GET(req: NextRequest) {
  const back = (status: string) => NextResponse.redirect(`${appUrl()}/clipper?instagram=${status}`);
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (searchParams.get('error')) return back('cancelled');
  if (!code || !state || state !== req.cookies.get('instagram_oauth_state')?.value) return back('error');

  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);

  try {
    const tokens = await exchangeInstagramCode(code);
    const user = await getInstagramUser(tokens.accessToken);
    const now = Date.now();
    const { error } = await createAdminClient()
      .from('social_accounts')
      .upsert(
        {
          creator_id: viewer.creatorId,
          platform: 'instagram',
          platform_user_id: user.userId,
          username: user.username,
          follower_count: user.followers,
          access_token_enc: encryptSecret(tokens.accessToken),
          refresh_token_enc: null,
          // Our login configuration's token never expires; keep a far date so the column stays filled.
          access_expires_at: new Date(now + (tokens.expiresIn ?? 10 * 365 * 86_400) * 1000).toISOString(),
          refresh_expires_at: null,
          scopes: INSTAGRAM_SCOPES,
          updated_at: new Date(now).toISOString(),
        },
        { onConflict: 'creator_id,platform' },
      );
    if (error) return back(error.code === '23505' ? 'already_linked' : 'error');
  } catch {
    return back('error');
  }

  const res = back('connected');
  res.cookies.delete({ name: 'instagram_oauth_state', path: '/api/oauth/instagram' });
  return res;
}
