import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getConnectedYouTubeChannel } from '@/lib/platforms/youtube';
import { appUrl } from '@/lib/env';

/** Google sends the clipper back here; we save the channel they signed in with. */
export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const res = NextResponse.redirect(`${appUrl()}/account?tab=connections&youtube=${status}`);
    res.cookies.delete({ name: 'youtube_oauth_state', path: '/api/oauth/youtube' });
    return res;
  };
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (searchParams.get('error')) return back('cancelled');
  if (!code || !state || state !== req.cookies.get('youtube_oauth_state')?.value) return back('error');

  const viewer = await getViewer();
  if (!viewer?.creatorId) return NextResponse.redirect(`${appUrl()}/login`);

  try {
    const channel = await getConnectedYouTubeChannel(code);
    if (!channel) return back('no_channel');
    const { error } = await createAdminClient()
      .from('social_accounts')
      .upsert(
        { creator_id: viewer.creatorId, platform: 'youtube', platform_user_id: channel.id, username: channel.title, follower_count: channel.subscribers, updated_at: new Date().toISOString() },
        { onConflict: 'creator_id,platform' },
      );
    if (error) return back(error.code === '23505' ? 'already_linked' : 'error');
  } catch {
    return back('error');
  }
  revalidatePath('/clipper');
  return back('connected');
}
