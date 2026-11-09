import Link from 'next/link';
import { Compass, Music2, Wallet } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { compact, usd } from '@/lib/format';
import { connectTikTok, startPayoutOnboarding } from '@/actions/creator';
import { isDemo } from '@/lib/env';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { Checklist, ConnectionCard, EnrollmentCard, MarketCard } from '@/components/views';

export const dynamic = 'force-dynamic';

const tiktokMessages: Record<string, [string, boolean]> = {
  connected: ['TikTok connected.', true],
  missing_scope: ['Please allow video access. We need it to verify your views.', false],
  already_linked: ['That TikTok account is linked to another creator.', false],
  error: ['TikTok connection failed. Try again.', false],
};

export default async function CreatorPage({ searchParams }: { searchParams: { tiktok?: string; payouts?: string } }) {
  const d = await getCreatorDashboard();
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  const notice: [string, boolean] | undefined = searchParams.tiktok
    ? tiktokMessages[searchParams.tiktok]
    : searchParams.payouts === 'connected'
      ? ['Payout account ready.', true]
      : undefined;

  const connectTikTokButton = (
    <form action={connectTikTok}>
      <Button size="sm">Connect TikTok</Button>
    </form>
  );
  const payoutsButton = (
    <form action={startPayoutOnboarding}>
      <Button size="sm">Set up payouts</Button>
    </form>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${d.name}`}
        description="Your campaigns, codes and verified earnings."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />

      {notice && <p className={`rounded-lg px-4 py-3 text-sm ${notice[1] ? 'bg-accent-50 text-accent-700' : 'bg-rose-50 text-rose-700'}`}>{notice[0]}</p>}

      <Checklist
        steps={[
          { label: 'Connect TikTok', detail: 'We read your view counts straight from TikTok. No screenshots.', done: !!d.tiktok, action: connectTikTokButton },
          { label: 'Set up payouts', detail: 'Stripe sends your earnings to your bank.', done: d.payoutsEnabled, action: payoutsButton },
          { label: 'Join a campaign', detail: 'You get a personal code and tracking link.', done: d.enrollments.length > 0, action: <ButtonLink href="/creator/discover" size="sm">Discover</ButtonLink> },
          { label: 'Submit your first video', detail: 'Paste the TikTok link under the campaign below.', done: subs.length > 0 },
        ]}
      />

      <StatGrid
        items={[
          { label: 'Earned', value: usd(subs.reduce((a, s) => a + s.payout_earned, 0)) },
          { label: 'Paid out', value: usd(subs.reduce((a, s) => a + s.payout_transferred, 0)) },
          { label: 'Verified views', value: compact(subs.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Orders from you', value: compact(subs.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty icon={<Compass />} title="No campaigns yet" body="Find one that fits your content in Discover." action={<ButtonLink href="/creator/discover">Browse campaigns</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {d.enrollments.map((e) => (
              <EnrollmentCard
                key={e.enrollment.id}
                {...e}
                href={`/creator/campaigns/${e.campaign.id}`}
                link={Link}
                submitForm={<SubmitVideoForm campaignId={e.campaign.id} />}
              />
            ))}
          </div>
        )}
      </section>

      {d.openCampaigns.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Open now</h2>
            <Link href="/creator/discover" className="text-sm text-zinc-500 hover:text-zinc-900">
              See all {d.openCampaigns.length}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.openCampaigns.slice(0, 3).map((c) => (
              <MarketCard key={c.id} c={c} href={`/creator/campaigns/${c.id}`} link={Link} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Accounts</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ConnectionCard
            icon={<Music2 />}
            title="TikTok"
            connected={!!d.tiktok}
            detail={d.tiktok ? `@${d.tiktok.username ?? 'connected'} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Not connected'}
            action={
              <form action={connectTikTok}>
                <Button size="sm" variant={d.tiktok ? 'ghost' : 'secondary'}>
                  {d.tiktok ? 'Reconnect' : 'Connect'}
                </Button>
              </form>
            }
          />
          <ConnectionCard
            icon={<Wallet />}
            title="Payouts"
            connected={d.payoutsEnabled}
            detail={d.payoutsEnabled ? 'Stripe Express' : 'Not set up'}
            action={
              <form action={startPayoutOnboarding}>
                <Button size="sm" variant={d.payoutsEnabled ? 'ghost' : 'secondary'}>
                  {d.payoutsEnabled ? 'Manage' : 'Set up'}
                </Button>
              </form>
            }
          />
        </div>
      </Card>
    </div>
  );
}
