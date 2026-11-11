import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppLayout } from '@/components/app-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AccountSettingsForm } from '@/components/forms/account-settings-form';
import { disconnectDiscord } from '@/actions/profile';

export const dynamic = 'force-dynamic';

const DISCORD_NOTE: Record<string, [string, boolean]> = {
  connected: ['Discord connected. Check the Atlas server: your roles are set.', true],
  disconnected: ['Discord unlinked.', true],
  already_linked: ['That Discord account is already linked to another Atlas account.', false],
  unavailable: ['Discord linking isn’t switched on yet. Try again soon.', false],
  error: ['Couldn’t connect Discord. Try again.', false],
};

export default async function AccountPage({ searchParams }: { searchParams: { discord?: string } }) {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const admin = createAdminClient();
  const clipper = !!viewer.creatorId && !viewer.brandId;
  const { data } = clipper
    ? await admin.from('creators').select('display_name, bio, avatar_url, discord_username, founder_number').eq('id', viewer.creatorId!).single()
    : await admin.from('brands').select('name, avatar_url').eq('id', viewer.brandId!).single();
  const row = (data ?? {}) as { display_name?: string; name?: string; bio?: string | null; avatar_url?: string | null; discord_username?: string | null; founder_number?: number | null };
  const note = searchParams.discord ? DISCORD_NOTE[searchParams.discord] : undefined;
  return (
    <AppLayout role={clipper ? 'clipper' : 'streamer'}>
      <PageHeader title="Settings" description="Your picture, name and account details." />
      <div className="max-w-2xl">
        {note && <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${note[1] ? 'bg-brand-a/10 ring-1 ring-inset ring-brand-a/30' : 'bg-rose-50 text-rose-700'}`}>{note[0]}</p>}
        <AccountSettingsForm name={row.display_name ?? row.name ?? ''} bio={row.bio ?? ''} avatar={row.avatar_url ?? null} email={viewer.email} clipper={clipper} />
        {clipper && (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: '#5865F2', color: '#fff' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden>
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.1 14.1 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Atlas Discord</p>
              <p className="text-sm text-zinc-500">
                {row.discord_username
                  ? `Linked as ${row.discord_username}. Your ${row.founder_number ? 'Founder and ' : ''}tier roles update automatically.`
                  : `Link your Discord to join the Atlas server and get your ${row.founder_number ? 'Founder and ' : ''}tier role automatically.`}
              </p>
            </div>
            {row.discord_username ? (
              <form action={disconnectDiscord}>
                <button className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-medium transition hover:bg-zinc-50">Unlink</button>
              </form>
            ) : (
              <a href="/api/oauth/discord/start" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition hover:brightness-110" style={{ backgroundColor: '#5865F2', color: '#fff' }}>
                Connect Discord
              </a>
            )}
          </section>
        )}
        <p className="mt-6 text-sm text-zinc-500">
          Need to change your password? Use <Link href="/forgot" className="underline">reset password</Link>.
        </p>
      </div>
    </AppLayout>
  );
}
