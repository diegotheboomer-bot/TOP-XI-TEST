import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Compass, Mail, Wallet } from 'lucide-react';
import { PlatformIcon } from '@/components/platform-icon';
import { YouTubeVerify } from '@/components/forms/youtube-verify';
import { getCreatorDashboard } from '@/lib/data';
import { getMyInvites, needsWelcome } from '@/lib/data';
import { compact, usd } from '@/lib/format';
import { payoutDestination } from '@/lib/payout-methods';
import { connectInstagram, connectTikTok, respondInvite } from '@/actions/creator';
import { ActionButton } from '@/components/action-button';
import { isDemo } from '@/lib/env';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { TierCard } from '@/components/tier-progress';
import { Checklist, ConnectionCard, EnrollmentCard, MarketCard, StreamerAvatar } from '@/components/views';

export const dynamic = 'force-dynamic';

const instagramMessages: Record<string, [string, boolean]> = {
  connected: ['Instagram connected.', true],
  missing_scope: ['Please allow insights access. We need it to read your Reel views.', false],
  already_linked: ['That Instagram account is linked to another creator.', false],
  cancelled: ['Instagram connection cancelled.', false],
  error: ['Instagram connection failed. It needs a Professional (Creator or Business) account. Try again.', false],
};

const tiktokMessages: Record<string, [string, boolean]> = {
  connected: ['TikTok connected.', true],
  missing_scope: ['Please allow video access. We need it to verify your views.', false],
  already_linked: ['That TikTok account is linked to another creator.', false],
  error: ['TikTok connection failed. Try again.', false],
};

export default async function CreatorPage({ searchParams }: { searchParams: { tiktok?: string; instagram?: string } }) {
  if (await needsWelcome()) redirect('/welcome');
  const [d, invites] = await Promise.all([getCreatorDashboard(), getMyInvites()]);
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  const firstOpen = d.enrollments.find((e) => !e.submission);
  const notice: [string, boolean] | undefined = searchParams.tiktok ? tiktokMessages[searchParams.tiktok] : searchParams.instagram ? instagramMessages[searchParams.instagram] : undefined;

  const payoutsButton = (
    <ButtonLink href="/clipper/payouts" size="sm">
      Set up payouts
    </ButtonLink>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${d.name}`}
        description="Your campaigns, clips and earnings."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />

      {d.record && <TierCard record={d.record} />}

      {invites.length > 0 && (
        <section className="rounded-2xl border border-brand-b/40 bg-white p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <Mail className="size-4 text-[rgb(var(--brand-ta))]" /> You’ve been invited
          </h2>
          <ul className="mt-4 space-y-3">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-3.5 sm:flex-row sm:items-center">
                <StreamerAvatar name={i.brandName} size="md" src={i.brandAvatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{i.brandName}</span> invited you to{' '}
                    {i.live ? (
                      <Link href={`/clipper/campaigns/${i.campaignId}`} className="font-semibold underline-offset-2 hover:underline">
                        {i.campaignTitle}
                      </Link>
                    ) : (
                      <span className="font-semibold">{i.campaignTitle}</span>
                    )}
                  </p>
                  {!i.live && <p className="mt-0.5 text-xs font-medium text-amber-700">Launching soon. You can join as soon as it goes live.</p>}
                  {i.message && <p className="mt-0.5 text-sm text-zinc-600">“{i.message}”</p>}
                </div>
                <div className="flex gap-2">
                  {i.live && <ActionButton variant="primary" action={respondInvite.bind(null, i.id, true)}>Join</ActionButton>}
                  <ActionButton action={respondInvite.bind(null, i.id, false)}>Decline</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notice && <p className={`rounded-lg px-4 py-3 text-sm ${notice[1] ? 'bg-accent-50 text-accent-700' : 'bg-rose-50 text-rose-700'}`}>{notice[0]}</p>}

      <Checklist
        title="How to start earning"
        steps={[
          {
            label: 'Pick a campaign',
            detail: 'Browse Discover and join a streamer you like clipping. It’s free.',
            done: d.enrollments.length > 0,
            action: <ButtonLink href="/clipper/discover" size="sm">Discover</ButtonLink>,
          },
          {
            label: 'Post your first clip',
            detail: 'Open the campaign. The “Your next step” box walks you through it.',
            done: subs.length > 0,
            action: firstOpen ? <ButtonLink href={`/clipper/campaigns/${firstOpen.campaign.id}`} size="sm">Open campaign</ButtonLink> : undefined,
          },
          { label: 'Set up payouts', detail: 'Add your bank account so you can be paid.', done: d.payoutsEnabled, action: payoutsButton },
        ]}
      />

      <StatGrid
        items={[
          { label: 'Earned', value: usd(subs.reduce((a, s) => a + s.payout_earned, 0)) },
          { label: 'Paid out', value: usd(subs.reduce((a, s) => a + s.payout_transferred, 0)) },
          { label: 'Verified views', value: compact(subs.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Clips', value: compact(subs.length) },
        ]}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty icon={<Compass />} title="No campaigns yet" body="Find a streamer you like clipping in Discover." action={<ButtonLink href="/clipper/discover">Browse campaigns</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {d.enrollments.map((e) => (
              <EnrollmentCard
                key={e.enrollment.id}
                {...e}
                href={`/clipper/campaigns/${e.campaign.id}`}
                link={Link}
                submitForm={
                  <ButtonLink href={`/clipper/campaigns/${e.campaign.id}`} className="w-full">
                    Post your clip
                  </ButtonLink>
                }
              />
            ))}
          </div>
        )}
      </section>

      {d.openCampaigns.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Open now</h2>
            <Link href="/clipper/discover" className="text-sm text-zinc-500 hover:text-zinc-900">
              See all {d.openCampaigns.length}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.openCampaigns.slice(0, 3).map((c) => (
              <MarketCard key={c.id} c={c} href={`/clipper/campaigns/${c.id}`} link={Link} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Accounts</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ConnectionCard
            icon={<PlatformIcon platform="tiktok" />}
            title="TikTok"
            connected={!!d.tiktok}
            detail={d.tiktok ? `@${d.tiktok.username ?? 'connected'} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Needed for TikTok clips only'}
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
            detail={d.youtube ? `${d.youtube.channel ?? 'Channel'}${d.youtube.subscribers != null ? ` · ${compact(d.youtube.subscribers)} subscribers` : ''}` : 'Connect your channel once to submit Shorts'}
            action={<YouTubeVerify code={d.youtubeCode} verified={!!d.youtube} />}
          />
          <ConnectionCard
            icon={<PlatformIcon platform="instagram" />}
            title="Instagram Reels"
            connected={!!d.instagram}
            detail={d.instagram ? `@${d.instagram.username ?? 'connected'}${d.instagram.followers != null ? ` · ${compact(d.instagram.followers)} followers` : ''}` : 'Creator or Business account'}
            action={
              <form action={connectInstagram}>
                <Button size="sm" variant={d.instagram ? 'ghost' : 'secondary'}>
                  {d.instagram ? 'Reconnect' : 'Connect'}
                </Button>
              </form>
            }
          />
          <ConnectionCard
            icon={<Wallet />}
            title="Payouts"
            connected={d.payoutsEnabled}
            detail={d.payoutsEnabled ? payoutDestination(d.payout) : 'Not set up'}
            action={
              <ButtonLink href="/clipper/payouts" size="sm" variant={d.payoutsEnabled ? 'ghost' : 'secondary'}>
                {d.payoutsEnabled ? 'Manage' : 'Set up'}
              </ButtonLink>
            }
          />
        </div>
      </Card>
    </div>
  );
}
