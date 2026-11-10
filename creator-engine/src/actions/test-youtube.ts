'use server';

// Test page only (/test/youtube): runs the YouTube and TikTok checks without saving anything.
import { getViewer } from '@/lib/session';
import { getYouTubeChannel, getYouTubeVideos, parseChannelInput } from '@/lib/platforms/youtube';
import { parseVideoUrl, parseVideoUrlResolving } from '@/lib/video-url';
import { queryTikTokVideos } from '@/lib/platforms/tiktok';
import { getTikTokAccessToken } from '@/lib/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import { youtubeVerifyCode } from '@/lib/youtube-verify';
import type { SubmitCheck } from './result';

export type TestResult = { checks: SubmitCheck[]; channelId?: string } | undefined;

async function testCode(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer ? youtubeVerifyCode(`test:${viewer.userId}`) : null;
}

export async function testChannel(_prev: TestResult, form: FormData): Promise<TestResult> {
  const code = await testCode();
  if (!code) return { checks: [{ label: 'Signed in', status: 'fail', detail: 'Sign in first.' }] };
  const checks: SubmitCheck[] = [];
  const ref = parseChannelInput(String(form.get('channel') ?? ''));
  if (!ref) return { checks: [{ label: 'Link recognised', status: 'fail', detail: 'Paste a channel link like youtube.com/@name.' }] };
  checks.push({ label: 'Link recognised', status: 'pass', detail: JSON.stringify(ref) });
  let channel;
  try {
    channel = await getYouTubeChannel(ref);
  } catch (e) {
    checks.push({ label: 'YouTube reached', status: 'fail', detail: e instanceof Error ? e.message : 'Error' });
    return { checks };
  }
  if (!channel) return { checks: [...checks, { label: 'Channel found', status: 'fail', detail: 'No channel at that link.' }] };
  checks.push({ label: 'Channel found', status: 'pass', detail: `${channel.title} (${channel.id})` });
  const found = channel.description.toUpperCase().includes(code);
  checks.push(
    found
      ? { label: 'Code in description', status: 'pass', detail: `${code} found` }
      : { label: 'Code in description', status: 'fail', detail: `${code} not found. Saved changes can take a minute.` },
  );
  return { checks, channelId: channel.id };
}

export async function testShort(_prev: TestResult, form: FormData): Promise<TestResult> {
  if (!(await testCode())) return { checks: [{ label: 'Signed in', status: 'fail', detail: 'Sign in first.' }] };
  const channelId = String(form.get('channelId') ?? '');
  const parsed = parseVideoUrl(String(form.get('video') ?? ''));
  if (!parsed.ok || parsed.video.platform !== 'youtube') return { checks: [{ label: 'YouTube link recognised', status: 'fail', detail: 'Paste a YouTube Shorts link.' }] };
  const checks: SubmitCheck[] = [{ label: 'YouTube link recognised', status: 'pass', detail: parsed.video.videoId }];
  let video;
  try {
    [video] = await getYouTubeVideos([parsed.video.videoId]);
  } catch (e) {
    return { checks: [...checks, { label: 'YouTube reached', status: 'fail', detail: e instanceof Error ? e.message : 'Error' }] };
  }
  if (!video) return { checks: [...checks, { label: 'Video found', status: 'fail', detail: 'Private or doesn’t exist.' }] };
  checks.push({ label: 'Video found', status: 'pass', detail: `${video.views.toLocaleString('en-US')} views · ${video.likes.toLocaleString('en-US')} likes` });
  checks.push({ label: 'Posted', status: 'pass', detail: video.publishedAt ?? 'unknown' });
  checks.push(
    !channelId
      ? { label: 'On the tested channel', status: 'warn', detail: 'Check a channel above first to compare.' }
      : video.channelId === channelId
        ? { label: 'On the tested channel', status: 'pass' }
        : { label: 'On the tested channel', status: 'fail', detail: `It’s on ${video.channelId}` },
  );
  checks.push(/#ad\b/i.test(video.caption ?? '') ? { label: '#ad in caption', status: 'pass' } : { label: '#ad in caption', status: 'warn', detail: 'Not found' });
  return { checks };
}

/** Test a TikTok link against the signed-in clipper's connected TikTok account. */
export async function testTikTok(_prev: TestResult, form: FormData): Promise<TestResult> {
  const viewer = await getViewer();
  if (!viewer) return { checks: [{ label: 'Signed in', status: 'fail', detail: 'Sign in first.' }] };
  if (!viewer.creatorId) return { checks: [{ label: 'Clipper account', status: 'fail', detail: 'Sign in with your clipper account.' }] };
  const admin = createAdminClient();
  const { data: account } = await admin.from('social_accounts').select('username').eq('creator_id', viewer.creatorId).eq('platform', 'tiktok').maybeSingle();
  if (!account) return { checks: [{ label: 'TikTok connected', status: 'fail', detail: 'Connect TikTok on your dashboard first (Accounts → TikTok → Connect).' }] };
  const checks: SubmitCheck[] = [{ label: 'TikTok connected', status: 'pass', detail: account.username ? `@${account.username}` : undefined }];
  const parsed = await parseVideoUrlResolving(String(form.get('video') ?? ''));
  if (!parsed.ok || parsed.video.platform !== 'tiktok') return { checks: [...checks, { label: 'TikTok link recognised', status: 'fail', detail: 'Paste a TikTok video link.' }] };
  checks.push({ label: 'TikTok link recognised', status: 'pass', detail: parsed.video.videoId });
  let video;
  try {
    const token = await getTikTokAccessToken(admin, viewer.creatorId);
    [video] = await queryTikTokVideos(token, [parsed.video.videoId]);
  } catch (e) {
    return { checks: [...checks, { label: 'TikTok reached', status: 'fail', detail: e instanceof Error ? e.message : 'Error' }] };
  }
  if (!video) return { checks: [...checks, { label: 'Video on your account', status: 'fail', detail: 'TikTok didn’t return it, so it isn’t on your connected account.' }] };
  checks.push({ label: 'Video on your account', status: 'pass' });
  checks.push({ label: 'Stats', status: 'pass', detail: `${video.views.toLocaleString('en-US')} views · ${video.likes.toLocaleString('en-US')} likes · ${video.comments.toLocaleString('en-US')} comments` });
  checks.push({ label: 'Posted', status: 'pass', detail: video.publishedAt ?? 'unknown' });
  checks.push(/#ad\b/i.test(video.caption ?? '') ? { label: '#ad in caption', status: 'pass' } : { label: '#ad in caption', status: 'warn', detail: 'Not found' });
  return { checks };
}
