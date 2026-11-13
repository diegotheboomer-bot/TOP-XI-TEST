import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeTikTokCode, getTikTokUser } from '@/lib/platforms/tiktok';
import { encryptSecret } from '@/lib/crypto';
import { storeSocialAvatar } from '@/lib/social-avatar';
import { appUrl } from '@/lib/env';
import { finishOAuth } from '@/lib/oauth-popup';

export async function GET(req: NextRequest) {
  const back = (status: string) => finishOAuth(req, `${appUrl()}/clipper?tiktok=${status}`);
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('tiktok_oauth_state')?.value) return back('error');

  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);

  try {
    const tokens = await exchangeTikTokCode(code);
    const granted = tokens.scope.split(',');
    if (!granted.includes('video.list')) return back('missing_scope');
    const user = await getTikTokUser(tokens.access_token);
    const now = Date.now();
    const admin = createAdminClient();
    const avatar = await storeSocialAvatar(admin, viewer.creatorId, 'tiktok', user.avatar_url);

    const { error } = await admin
      .from('social_accounts')
      .upsert(
        {
          creator_id: viewer.creatorId,
          platform: 'tiktok',
          platform_user_id: tokens.open_id,
          username: user.display_name ?? null,
          follower_count: user.follower_count ?? null,
          ...(avatar ? { avatar_url: avatar } : {}),
          access_token_enc: encryptSecret(tokens.access_token),
          refresh_token_enc: encryptSecret(tokens.refresh_token),
          access_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
          refresh_expires_at: new Date(now + tokens.refresh_expires_in * 1000).toISOString(),
          scopes: granted,
          updated_at: new Date(now).toISOString(),
        },
        { onConflict: 'creator_id,platform' },
      );
    if (error) return back(error.code === '23505' ? 'already_linked' : 'error');
  } catch {
    return back('error');
  }

  const res = back('connected');
  res.cookies.delete({ name: 'tiktok_oauth_state', path: '/api/oauth/tiktok' });
  return res;
}
