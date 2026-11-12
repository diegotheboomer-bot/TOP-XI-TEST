import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BadgeCheck, Clapperboard, DollarSign, Eye, FolderOpen, Mail, TrendingUp, Upload, Wallet } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { getCreatorViewHistory, getMyInvites, needsWelcome } from '@/lib/data';
import { Spark } from '@/components/clipper-stats';
import { compact, usd } from '@/lib/format';
import { respondInvite } from '@/actions/creator';
import { ActionButton } from '@/components/action-button';
import { isDemo } from '@/lib/env';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button-link';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { NextTierBar } from '@/components/tier-progress';
import { approvalRate, tierProgress } from '@/lib/tiers';
import { TierGuideButton } from '@/components/tier-guide';
import { ClipperCard } from '@/components/clipper-card';
import { Checklist, MarketCard, StreamerAvatar } from '@/components/views';

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
  const [d, invites, history] = await Promise.all([getCreatorDashboard(), getMyInvites(), getCreatorViewHistory()]);
  const subs = d.enrollments.flatMap((e) => e.submissions);
  const earned = subs.reduce((a, s) => a + s.payout_earned, 0);
  const paid = subs.reduce((a, s) => a + s.payout_transferred, 0);
  const views = subs.filter((s) => s.status !== 'flagged').reduce((a, s) => a + s.current_view_count, 0);
  const week = history.length > 7 ? Math.max(0, history[history.length - 1].views - history[history.length - 8].views) : 0;
  const firstOpen = d.enrollments.find((e) => !e.submission);
  const waiting = d.enrollments.filter((e) => e.campaign.status === 'active' && e.submissions.length === 0);
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

      {d.record && (
        // Phones: the card (with its tier progress inside), then all-time stats.
        <section className="grid grid-cols-1 gap-4 md:grid-cols-[19rem_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:gap-5">
          <TierGuideButton record={d.record} className="order-2 h-full w-full md:col-start-1 md:row-span-2 md:row-start-1">
            <ClipperCard
              name={d.name}
              tier={d.tier ?? 'silver'}
              founder={d.founder ?? null}
              views={d.record.views}
              clips={d.record.approved}
              joinedAt={d.joinedAt ?? null}
              progress={tierProgress(d.record)}
              progressClassName="mt-5 md:hidden"
            />
          </TierGuideButton>
            {/* All-time stats with the last 30 days of views underneath */}
            <div className="relative order-3 flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card md:col-start-2 md:row-span-2 md:row-start-1">
              <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand opacity-[0.1] blur-3xl" />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">All time</p>
                  {week > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-a/15 px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--brand-ta))]">
                      <TrendingUp className="size-3" /> +{compact(week)} views this week
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Eye className="size-3.5 text-[rgb(var(--brand-ta))]" /> Views
                    </p>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{compact(views)}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <DollarSign className="size-3.5 text-[rgb(var(--brand-ta))]" /> Earned
                    </p>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-brand sm:text-4xl">{usd(earned)}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-y-4 border-t border-zinc-100 pt-4 sm:grid-cols-4 sm:divide-x sm:divide-zinc-100">
                  {(
                    [
                      [Wallet, 'Paid out', usd(paid)],
                      [Clapperboard, 'Clips', compact(subs.length)],
                      [BadgeCheck, 'Approval', `${Math.round(approvalRate(d.record) * 100)}%`],
                      [FolderOpen, 'Campaigns', String(d.enrollments.length)],
                    ] as const
                  ).map(([Icon, k, v]) => (
                    <div key={k} className="sm:px-4 sm:first:pl-0">
                      <dt className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Icon className="size-3.5 text-[rgb(var(--brand-ta))]" /> {k}
                      </dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="relative">
                <p className="px-5 text-[11px] text-zinc-500 sm:px-6">Total views on your clips · last 30 days</p>
                <Spark points={history.map((h) => h.views)} />
              </div>
              {/* Tier progress, in the same panel (phones show it on the card instead) */}
              <div className="relative mt-auto hidden border-t border-zinc-100 p-5 sm:px-6 md:block">
                <NextTierBar record={d.record} />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">Tap your card to see every tier and its perks.</p>
                  <TierGuideButton record={d.record} />
                </div>
              </div>
            </div>
        </section>
      )}

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

      {/* Joined but nothing posted yet: nudge straight to the submit box. */}
      {waiting.length > 0 && (
        <section className="space-y-2">
          {waiting.slice(0, 3).map((e) => (
            <Link
              key={e.campaign.id}
              href={`/clipper/campaigns/${e.campaign.id}#post`}
              className="flex items-center gap-3 rounded-2xl border border-brand-b/40 bg-brand-a/10 px-4 py-3 transition hover:bg-brand-a/15"
            >
              <Upload className="size-5 shrink-0 text-[rgb(var(--brand-ta))]" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-semibold">{e.campaign.title}</span>
                <span className="text-zinc-600">You joined. Post your first clip to start earning.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-[rgb(var(--brand-ta))]">Post →</span>
            </Link>
          ))}
        </section>
      )}

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

    </div>
  );
}
