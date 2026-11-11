import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, Pencil, Rocket, Users } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { getCampaignDetail, type SubmissionRow } from '@/lib/data';
import { compact, rateParts, usd, usdCompact } from '@/lib/format';
import { isDemo } from '@/lib/env';
import { achEnabled, feeFor } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelCampaign, createDepositIntent, payDemoDeposit, releasePayout, reviewSubmission, setCampaignStatus, simulateSale, simulateSync } from '@/actions/brand';
import { Card, CardHeader } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { ActionButton } from '@/components/action-button';
import { CampaignBadge } from '@/components/status';
import { BudgetMeter, CampaignCover, DemoBar, MomentBoard, PlatformChips, ReferenceList, RequirementList, StreamerAvatar, SubmissionTable, submissionActionKinds } from '@/components/views';
import { MomentForm } from '@/components/forms/moment-form';
import { AppAddBudget } from '@/components/checkout/app-checkout';
import { CancelCampaign, type CancelSummary } from '@/components/cancel-campaign';
import type { Campaign } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { funded?: string; fund?: string; saved?: string } }) {
  const detail = await getCampaignDetail(params.id);
  if (!detail) notFound();
  const { campaign: c, submissions, shopDomain, deposited, refunded, paidOut, fees, budget } = detail;
  const r = rateParts(c);
  const ended = c.status === 'completed';
  const { data: brandRow } = isDemo ? { data: null } : await createAdminClient().from('brands').select('early_partner').eq('id', c.brand_id).single();
  const plan = feeFor(!!brandRow?.early_partner);
  const feePercent = plan.percent;
  const cancel: CancelSummary = {
    refund: budget.available,
    reserved: Math.max(0, c.escrow_balance - budget.available),
    fees,
    feePercent,
    pending: submissions.filter((s) => s.status === 'pending_review').length,
  };
  const publishableKey = isDemo ? null : (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '');

  const views = submissions.reduce((a, s) => a + s.current_view_count, 0);
  const pending = submissions.filter((s) => s.status === 'pending_review').length;
  const fund = Number(searchParams.fund);
  const top = topClippers(submissions).slice(0, 5);

  return (
    <div className="space-y-6">
      <Link href="/streamer" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>

      {/* Header: cover, title, terms and the one action that matters next. */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CampaignCover campaign={c} brandName="" variant="card" showTitle={false} className="w-full shrink-0 rounded-2xl shadow-card sm:w-60" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CampaignBadge status={c.status} />
            {c.category && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">{c.category}</span>}
          </div>
          <h1 className="balance mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-medium text-zinc-900">
              {r.rate} {r.unit}
            </span>{' '}
            · {r.terms}
          </p>
          <PlatformChips platforms={c.platforms} className="mt-3" />
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 sm:w-44 sm:grid-cols-1 [&>*]:w-full [&_button]:h-9 [&_button]:w-full">
          {!ended && (
            <Link href={`/streamer/campaigns/${c.id}/edit`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium transition hover:bg-zinc-50">
              <Pencil className="size-3.5" /> Edit
            </Link>
          )}
          <StatusActions campaign={c} />
          {c.status !== 'draft' || c.escrow_balance > 0 ? <CancelCampaign summary={cancel} ended={ended} onConfirm={cancelCampaign.bind(null, c.id)} /> : null}
        </div>
      </section>

      {isDemo && !ended && (
        <DemoBar>
          <ActionButton action={simulateSync.bind(null, c.id)}>Run 4h sync</ActionButton>
          {shopDomain && <ActionButton action={simulateSale.bind(null, c.id)}>Simulate merch order</ActionButton>}
        </DemoBar>
      )}

      {searchParams.saved && <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">Changes saved. Clippers see them now.</p>}
      {searchParams.funded && <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">Payment received. Your budget updates as soon as Stripe confirms it.</p>}
      {c.status === 'draft' && <LaunchChecklist campaign={c} funded={c.escrow_balance > 0} />}

      <StatGrid
        items={[
          { label: 'Budget left', value: usd(c.escrow_balance), hint: `${usdCompact(budget.available)} free to earn` },
          { label: 'Views', value: compact(views), hint: 'Verified by the platforms' },
          { label: 'Clips', value: String(submissions.length), hint: pending ? `${pending} waiting for you` : 'All reviewed' },
          { label: 'Paid to clippers', value: usd(paidOut), hint: 'Clippers keep 100%' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <Card>
            <CardHeader
              title={pending ? `Clips · ${pending} to review` : 'Clips'}
              description="You approve every clip. Approved clips are paid automatically after 3 days; you can flag one until then."
            />
            {submissions.length === 0 ? (
              <Empty icon={<Users />} title="No clips yet" body="Clips show up here as soon as clippers post them." />
            ) : (
              <SubmissionTable rows={submissions} cap={c.cpm_cap} actions={(s) => <SubmissionActions s={s} ended={ended} />} />
            )}
          </Card>
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold tracking-tight">Brief</h2>
              {!ended && (
                <Link href={`/streamer/campaigns/${c.id}/edit`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                  Edit
                </Link>
              )}
            </div>
            {c.brief && <p className="mb-4 whitespace-pre-line leading-relaxed text-zinc-600">{c.brief}</p>}
            <RequirementList items={c.requirements} />
            {(c.asset_folder_url || (c.reference_items?.length ?? 0) > 0) && (
              <div className="mt-5 border-t border-zinc-100 pt-5">
                <p className="mb-2 text-[13px] font-medium text-zinc-700">References</p>
                <ReferenceList campaign={c} />
              </div>
            )}
          </Card>
          {c.moments_enabled && (
          <Card>
              <CardHeader title="Moments to clip" description="Pin timestamps from your stream so clippers know what to cut." />
              <MomentBoard moments={detail.moments} showClaimers empty="No moments pinned yet." />
              {!ended && (
                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <MomentForm campaignId={c.id} />
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold tracking-tight">Budget</h2>
              <span className="text-xs text-zinc-500">{usdCompact(deposited + refunded)} added</span>
            </div>
            <BudgetMeter budget={budget} className="mt-3" />
            <div className="mt-5">
              {ended ? (
                <p className="text-sm text-zinc-500">
                  {refunded > 0 ? `${usd(refunded)} refunded to your card. ` : ''}What’s left pays clippers for clips they’ve already earned on.
                </p>
              ) : publishableKey === '' ? (
                <p className="text-sm text-rose-600">Stripe isn’t set up: add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
              ) : (
                <>
                  <AppAddBudget
                    bankTransfer={achEnabled()}
                    campaign={{ id: c.id, title: c.title, payout_model: c.payout_model, cpm_rate: c.cpm_rate, status: c.status }}
                    feePercent={feePercent}
                    feeFixed={plan.fixed}
                    early={plan.early}
                    publishableKey={publishableKey}
                    createIntent={createDepositIntent}
                    payDemo={payDemoDeposit}
                    initialAmount={fund >= 50 && !searchParams.funded ? fund : undefined}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    {plan.early ? 'No service fee, only Stripe’s card processing. Unspent budget is refunded if you cancel.' : `${feePercent}% service fee on top. Unspent budget is refunded if you cancel; the fee isn’t.`}
                  </p>
                </>
              )}
            </div>
          </Card>

          {top.length > 0 && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Top clippers</h2>
                <Link href="/streamer/creators" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                  See all
                </Link>
              </div>
              <ol className="space-y-3">
                {top.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3">
                    <span className="w-4 text-center font-mono text-xs text-zinc-400">{i + 1}</span>
                    <StreamerAvatar name={t.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-zinc-500">
                        {compact(t.views)} views · {t.clips} {t.clips === 1 ? 'clip' : 'clips'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{usdCompact(t.earned)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}


        </div>
      </div>
    </div>
  );
}

/** Clippers on this campaign ranked by views, with what they've earned. */
function topClippers(rows: SubmissionRow[]) {
  const by = new Map<string, { name: string; views: number; earned: number; clips: number }>();
  for (const s of rows) {
    if (s.status === 'flagged') continue;
    const t = by.get(s.creator_name) ?? { name: s.creator_name, views: 0, earned: 0, clips: 0 };
    t.views += s.current_view_count;
    t.earned += s.payout_earned;
    t.clips++;
    by.set(s.creator_name, t);
  }
  return [...by.values()].sort((a, b) => b.views - a.views);
}

/** Shown while a campaign is a draft: what's done, what's left, and the launch button. */
function LaunchChecklist({ campaign, funded }: { campaign: Campaign; funded: boolean }) {
  const steps: [string, string, boolean][] = [
    ['Set up the campaign', 'Title, thumbnail, pay and rules', true],
    ['Add a budget', funded ? `${usd(campaign.escrow_balance)} ready for clippers` : 'Use “Add budget” below. Clippers can only join funded campaigns', funded],
    ['Launch', 'Clippers see it in Discover and can start posting', false],
  ];
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-white p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20" style={{ background: 'radial-gradient(70% 100% at 10% 0%, rgb(245 158 11 / 0.14), transparent 70%)' }} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <span className="size-2 animate-pulse rounded-full" style={{ backgroundColor: "#f59e0b" }} /> Not live yet
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Finish setting up your campaign</h2>
          <ol className="mt-4 space-y-3">
            {steps.map(([title, body, done], i) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    done ? 'bg-brand text-brand-ink' : 'border border-zinc-300 text-zinc-500',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <div>
                  <p className={cn('text-sm font-medium', done && 'text-zinc-500 line-through decoration-zinc-300')}>{title}</p>
                  <p className="text-xs text-zinc-500">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="sm:w-56">
          {funded ? (
            <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
              <Rocket className="size-4" /> Launch campaign
            </ActionButton>
          ) : (
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-500">Add a budget to unlock launch</p>
          )}
        </div>
      </div>
    </section>
  );
}

function StatusActions({ campaign }: { campaign: Campaign }) {
  if (campaign.status === 'completed' || campaign.status === 'draft') return null;
  return (
    <>
      {campaign.status === 'paused' && (
        <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
          Resume
        </ActionButton>
      )}
      {campaign.status === 'active' && <ActionButton action={setCampaignStatus.bind(null, campaign.id, 'paused')}>Pause</ActionButton>}
    </>
  );
}

function SubmissionActions({ s, ended }: { s: SubmissionRow; ended: boolean }) {
  const kinds = submissionActionKinds(s, ended);
  if (!kinds.length) return null;
  return (
    <>
      {kinds.map((k) =>
        k === 'approve' ? (
          <ActionButton key={k} variant="primary" action={reviewSubmission.bind(null, s.id, 'approve')}>Approve</ActionButton>
        ) : k === 'pay' ? (
          <ActionButton key={k} variant="primary" action={releasePayout.bind(null, s.id)}>Pay {usd(s.payout_earned - s.payout_transferred)}</ActionButton>
        ) : k === 'flag' ? (
          <ActionButton key={k} variant="danger" action={reviewSubmission.bind(null, s.id, 'flag')}>Flag</ActionButton>
        ) : (
          <ActionButton key={k} action={reviewSubmission.bind(null, s.id, 'approve')}>Clear flag</ActionButton>
        ),
      )}
    </>
  );
}
