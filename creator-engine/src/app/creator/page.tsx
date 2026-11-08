import { BadgeCheck, CircleDollarSign, Clock, Eye, Music2, ShoppingBag, Sparkles, Wallet } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { compact, termsLabel, usd } from '@/lib/format';
import { trackingLink } from '@/lib/attribution';
import { joinCampaign, startPayoutOnboarding } from '@/actions/creator';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Button, buttonClass } from '@/components/ui/button';
import { ActionButton } from '@/components/action-button';
import { CopyField } from '@/components/copy-button';
import { SubmissionBadge } from '@/components/status';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';

export const dynamic = 'force-dynamic';

const tiktokMessages: Record<string, [string, boolean]> = {
  connected: ['TikTok connected.', true],
  missing_scope: ['Please allow video access — we need it to verify your views.', false],
  already_linked: ['That TikTok account is linked to another creator.', false],
  error: ['TikTok connection failed. Try again.', false],
};

export default async function CreatorPage({ searchParams }: { searchParams: { tiktok?: string } }) {
  const d = await getCreatorDashboard();
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  const notice = searchParams.tiktok ? tiktokMessages[searchParams.tiktok] : undefined;

  return (
    <>
      <PageHeader title={`Hi, ${d.name}`} description="Your campaigns, codes and verified earnings." />

      {notice && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${notice[1] ? 'bg-accent-50 text-accent-700' : 'bg-rose-50 text-rose-700'}`}>{notice[0]}</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Connection
          icon={<Music2 />}
          title="TikTok"
          connected={!!d.tiktok}
          detail={d.tiktok ? `@${d.tiktok.username ?? 'connected'} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Required to verify your videos and views.'}
          action={
            <a href="/api/oauth/tiktok/start" className={buttonClass(d.tiktok ? 'ghost' : 'primary', 'sm')}>
              {d.tiktok ? 'Reconnect' : 'Connect TikTok'}
            </a>
          }
        />
        <Connection
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
            {d.enrollments.map(({ enrollment, campaign, brandName, shopDomain, submission }) => {
              const link = trackingLink(shopDomain, enrollment.ref_param);
              return (
                <Card key={enrollment.id} className="flex min-w-0 flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500">{brandName}</p>
                      <h3 className="mt-0.5 truncate font-semibold tracking-tight">{campaign.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{termsLabel(campaign)}</p>
                    </div>
                    {submission && <SubmissionBadge status={submission.status} />}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CopyField label="Discount code" value={enrollment.discount_code} />
                    {link ? <CopyField label="Tracking link" value={link} /> : <CopyField label="Ref parameter" value={`?ref=${enrollment.ref_param}`} />}
                  </div>

                  {submission ? (
                    <div className="space-y-2 rounded-xl bg-zinc-50 p-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-zinc-500">
                          {compact(submission.current_view_count)} views · {submission.current_conversions} orders
                        </span>
                        <span className="font-medium tabular-nums">
                          {usd(submission.payout_earned)} <span className="text-zinc-400">/ {usd(campaign.cpm_cap)}</span>
                        </span>
                      </div>
                      <Progress value={submission.payout_earned} max={campaign.cpm_cap} />
                      {submission.status === 'pending_review' && (
                        <p className="flex items-center gap-1.5 pt-1 text-xs text-zinc-500">
                          <Clock className="size-3.5" /> Waiting for brand approval
                        </p>
                      )}
                      {submission.flag_reason && <p className="pt-1 text-xs text-rose-600">{submission.flag_reason}</p>}
                    </div>
                  ) : (
                    <SubmitVideoForm campaignId={campaign.id} />
                  )}
                </Card>
              );
            })}
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
              <Card key={c.id} className="flex min-w-0 flex-col justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-500">{c.brandName}</p>
                  <h3 className="mt-0.5 truncate font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{termsLabel(c)}</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="green">{usd(c.escrow_balance)} in escrow</Badge>
                  <ActionButton variant="primary" action={joinCampaign.bind(null, c.id)}>
                    Join
                  </ActionButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Connection({ icon, title, connected, detail, action }: { icon: React.ReactNode; title: string; connected: boolean; detail: string; action: React.ReactNode }) {
  return (
    <Card className="flex min-w-0 items-center gap-4 p-5 sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700 [&>svg]:size-[18px]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {connected && <BadgeCheck className="size-4 text-accent-600" aria-label="Connected" />}
        </div>
        <p className="text-sm text-zinc-500">{detail}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </Card>
  );
}
