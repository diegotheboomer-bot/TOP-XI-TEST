import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KeyRound, Link2, LogOut, UserRound, Wallet } from 'lucide-react';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { compact } from '@/lib/format';
import { payoutDestination } from '@/lib/payout-methods';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCreatorDashboard } from '@/lib/data';
import { AppLayout } from '@/components/app-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { ConnectionCard } from '@/components/views';
import { PlatformIcon } from '@/components/platform-icon';
import { YouTubeVerify } from '@/components/forms/youtube-verify';
import { youtubeGoogleEnabled } from '@/lib/platforms/youtube';
import { AccountSettingsForm } from '@/components/forms/account-settings-form';
import { AccountSecurityForms } from '@/components/forms/account-security-forms';
import { disconnectDiscord } from '@/actions/profile';
import { connectInstagram, connectTikTok } from '@/actions/creator';
import { signOut } from '@/actions/account';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

const DISCORD_NOTE: Record<string, [string, boolean]> = {
  connected: ['Discord connected. Check the Atlas server: your roles are set.', true],
  disconnected: ['Discord unlinked.', true],
  already_linked: ['That Discord account is already linked to another Atlas account.', false],
  unavailable: ['Discord linking isn’t switched on yet. Try again soon.', false],
  error: ['Couldn’t connect Discord. Try again.', false],
};

const YOUTUBE_NOTE: Record<string, [string, boolean]> = {
  connected: ['YouTube connected. Any Short from that channel now counts as yours.', true],
  no_channel: ['That Google account has no YouTube channel. Pick the account (or brand channel) you post Shorts on.', false],
  already_linked: ['That YouTube channel is already connected to another Atlas account.', false],
  cancelled: ['YouTube connection cancelled.', false],
  error: ['Couldn’t connect YouTube. Try again.', false],
};

const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.1 14.1 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

type Tab = 'profile' | 'account' | 'connections';

/** Settings: profile, account (email, password) and, for clippers, connected accounts. */
export default async function AccountPage({ searchParams }: { searchParams: { tab?: string; discord?: string; youtube?: string } }) {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const admin = createAdminClient();
  const clipper = !!viewer.creatorId && !viewer.brandId;
  const { data } = clipper
    ? await admin.from('creators').select('display_name, bio, avatar_url, discord_username, founder_number').eq('id', viewer.creatorId!).single()
    : await admin.from('brands').select('name, avatar_url').eq('id', viewer.brandId!).single();
  const row = (data ?? {}) as { display_name?: string; name?: string; bio?: string | null; avatar_url?: string | null; discord_username?: string | null; founder_number?: number | null };

  const tabs: [Tab, string, React.ElementType][] = [
    ['profile', 'Profile', UserRound],
    ['account', 'Email & password', KeyRound],
    ...(clipper ? ([['connections', 'Connections', Link2]] as [Tab, string, React.ElementType][]) : []),
  ];
  const tab: Tab = (searchParams.discord || searchParams.youtube) && clipper ? 'connections' : tabs.some(([t]) => t === searchParams.tab) ? (searchParams.tab as Tab) : 'profile';
  const note = searchParams.discord ? DISCORD_NOTE[searchParams.discord] : searchParams.youtube ? YOUTUBE_NOTE[searchParams.youtube] : undefined;
  const d = clipper && tab === 'connections' ? await getCreatorDashboard() : null;

  return (
    <AppLayout role={clipper ? 'clipper' : 'streamer'}>
      <PageHeader title="Settings" description="Your profile, sign-in details and connected accounts." />
      <div className="max-w-2xl">
        <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Settings sections">
          {tabs.map(([t, label, Icon]) => (
            <Link
              key={t}
              href={`/account?tab=${t}`}
              className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition', t === tab ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900')}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>

        {note && <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${note[1] ? 'bg-brand-a/10 ring-1 ring-inset ring-brand-a/30' : 'bg-rose-50 text-rose-700'}`}>{note[0]}</p>}

        {tab === 'profile' && <AccountSettingsForm name={row.display_name ?? row.name ?? ''} bio={row.bio ?? ''} avatar={row.avatar_url ?? null} email={viewer.email} clipper={clipper} />}

        {tab === 'account' && (
          <div className="space-y-6">
            <AccountSecurityForms email={viewer.email} />
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold tracking-tight">Sign out</p>
                  <p className="text-sm text-zinc-500">Sign out of Atlas on this device.</p>
                </div>
                <form action={signOut}>
                  <Button variant="secondary">
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}

        {tab === 'connections' && d && (
          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold tracking-tight">Platforms</h2>
              <p className="mb-5 text-sm text-zinc-500">Connect where you post, so your clips’ views are tracked and paid.</p>
              <div className="space-y-5">
                <ConnectionCard
                  icon={<PlatformIcon platform="tiktok" />}
                  title="TikTok"
                  connected={!!d.tiktok}
                  detail={d.tiktok ? `@${d.tiktok.username ?? 'connected'} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Needed for TikTok clips'}
                  action={
                    <form action={connectTikTok}>
                      <Button size="sm" variant={d.tiktok ? 'ghost' : 'secondary'}>
                        {d.tiktok ? 'Reconnect' : 'Connect'}
                      </Button>
                    </form>
                  }
                />
                <ConnectionCard
                  icon={<PlatformIcon platform="youtube" />}
                  title="YouTube Shorts"
                  connected={!!d.youtube}
                  detail={d.youtube ? `${d.youtube.channel ?? 'Channel'}${d.youtube.subscribers != null ? ` · ${compact(d.youtube.subscribers)} subscribers` : ''}` : 'Verify your channel once to submit Shorts'}
                  action={<YouTubeVerify code={d.youtubeCode} verified={!!d.youtube} google={youtubeGoogleEnabled()} />}
                />
                <ConnectionCard
                  icon={<PlatformIcon platform="instagram" />}
                  title="Instagram Reels"
                  connected={!!d.instagram}
                  detail={d.instagram ? `@${d.instagram.username ?? 'connected'}${d.instagram.followers != null ? ` · ${compact(d.instagram.followers)} followers` : ''}` : process.env.NEXT_PUBLIC_INSTAGRAM_ENABLED === 'true' ? 'Creator or Business account' : 'Reels tracking is coming soon'}
                  action={
                    process.env.NEXT_PUBLIC_INSTAGRAM_ENABLED === 'true' ? (
                      <form action={connectInstagram}>
                        <Button size="sm" variant={d.instagram ? 'ghost' : 'secondary'}>
                          {d.instagram ? 'Reconnect' : 'Connect'}
                        </Button>
                      </form>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">Coming soon</span>
                    )
                  }
                />
              </div>
            </Card>
            <Card>
              <h2 className="mb-5 font-semibold tracking-tight">Community and payouts</h2>
              <div className="space-y-5">
                <ConnectionCard
                  icon={<DiscordLogo />}
                  title="Atlas Discord"
                  connected={!!row.discord_username}
                  status="Linked"
                  detail={row.discord_username ? `${row.discord_username} · ${row.founder_number ? 'Founder and ' : ''}tier roles update automatically` : `Join the server and get your ${row.founder_number ? 'Founder and ' : ''}tier role`}
                  action={
                    row.discord_username ? (
                      <form action={disconnectDiscord}>
                        <Button size="sm" variant="ghost">
                          Unlink
                        </Button>
                      </form>
                    ) : (
                      <a href="/api/oauth/discord/start" className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition hover:brightness-110" style={{ backgroundColor: '#5865F2', color: '#fff' }}>
                        Connect
                      </a>
                    )
                  }
                />
                <ConnectionCard
                  icon={<Wallet />}
                  title="Payouts"
                  connected={d.payoutsEnabled}
                  detail={d.payoutsEnabled ? payoutDestination(d.payout) : 'Not set up yet'}
                  action={
                    <ButtonLink href="/clipper/payouts" size="sm" variant={d.payoutsEnabled ? 'ghost' : 'secondary'}>
                      {d.payoutsEnabled ? 'Manage' : 'Set up'}
                    </ButtonLink>
                  }
                />
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
