import { CircleDollarSign, Eye, Music2, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { compact, usd } from '@/lib/format';
import { connectTikTok, joinCampaign, startPayoutOnboarding } from '@/actions/creator';
import { isDemo } from '@/lib/env';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { Stat } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/action-button';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { ConnectionCard, EnrollmentCard, OpenCampaignCard } from '@/components/views';

export const dynamic = 'force-dynamic';

const tiktokMessages: Record<string, [string, boolean]> = {
  connected: ['TikTok connected.', true],
  missing_scope: ['Please allow video access — we need it to verify your views.', false],
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

  return (
    <>
      <PageHeader
        title={`Hi, ${d.name}`}
        description="Your campaigns, codes and verified earnings."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />

      {notice && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${notice[1] ? 'bg-accent-50 text-accent-700' : 'bg-rose-50 text-rose-700'}`}>{notice[0]}</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConnectionCard
          icon={<Music2 />}
          title="TikTok"
          connected={!!d.tiktok}
          detail={d.tiktok ? `@${d.tiktok.username ?? 'connected'} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Required to verify your videos and views.'}
          action={
            <form action={connectTikTok}>
              <Button size="sm" variant={d.tiktok ? 'ghost' : 'primary'}>
                {d.tiktok ? 'Reconnect' : 'Connect TikTok'}
              </Button>
            </form>
          }
        />
        <ConnectionCard
          icon={<Wallet />}
          title="Payouts"
          connected={d.payoutsEnabled}
          detail={d.payoutsEnabled ? 'Stripe Express account active.' : 'Set up Stripe to receive transfers.'}
          action={
            <form action={startPayoutOnboarding}>
              <Button size="sm" variant={d.payoutsEnabled ? 'ghost' : 'primary'}>
                {d.payoutsEnabled ? 'Manage' : 'Set up payouts'}
              </Button>
            </form>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Earned" value={usd(subs.reduce((a, s) => a + s.payout_earned, 0))} icon={<CircleDollarSign />} />
        <Stat label="Paid out" value={usd(subs.reduce((a, s) => a + s.payout_transferred, 0))} icon={<Wallet />} />
        <Stat label="Verified views" value={compact(subs.reduce((a, s) => a + s.current_view_count, 0))} icon={<Eye />} />
        <Stat label="Orders" value={compact(subs.reduce((a, s) => a + s.current_conversions, 0))} icon={<ShoppingBag />} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">My campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty icon={<Sparkles />} title="You haven’t joined a campaign" body="Pick one below — you’ll get a personal discount code and tracking link instantly." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {d.enrollments.map((e) => (
              <EnrollmentCard key={e.enrollment.id} {...e} submitForm={<SubmitVideoForm campaignId={e.campaign.id} />} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Open campaigns</h2>
        {d.openCampaigns.length === 0 ? (
          <Empty icon={<Sparkles />} title="Nothing open right now" body="New campaigns appear here as soon as brands go live." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.openCampaigns.map((c) => (
              <OpenCampaignCard
                key={c.id}
                c={c}
                action={
                  <ActionButton variant="primary" action={joinCampaign.bind(null, c.id)}>
                    Join
                  </ActionButton>
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
