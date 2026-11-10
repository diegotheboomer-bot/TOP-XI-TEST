import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { YouTubeTest } from '@/components/forms/youtube-test';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { youtubeVerifyCode } from '@/lib/youtube-verify';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'YouTube test', robots: { index: false } };

/** Temporary test page: runs the YouTube channel and Short checks without saving anything. */
export default async function YouTubeTestPage() {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  return (
    <AuthShell title="YouTube test" subtitle="Nothing here is saved. It only runs the same checks the site uses." wide>
      <YouTubeTest code={youtubeVerifyCode(`test:${viewer.userId}`)} />
    </AuthShell>
  );
}
