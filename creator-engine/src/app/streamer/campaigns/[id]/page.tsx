import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronDown, Store, Users, Wallet } from 'lucide-react';
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
import { BudgetMeter, CampaignCover, DemoBar, MomentBoard, PlatformChips, ReferenceList, RequirementList, StorefrontStatus, StreamerAvatar, SubmissionTable, submissionActionKinds } from '@/components/views';
import { MomentForm } from '@/components/forms/moment-form';
import { ConnectStoreForm } from '@/components/forms/campaign-forms';
import { AppAddBudget } from '@/components/checkout/app-checkout';
import { CancelCampaign, type CancelSummary } from '@/components/cancel-campaign';
import type { Campaign } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { funded?: string; fund?: string } }) {
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
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch [&>*]:flex-1 sm:[&>*]:flex-none">
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

      {searchParams.funded && <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">Payment received. Your budget updates as soon as Stripe confirms it.</p>}
      {c.status === 'draft' && c.escrow_balance <= 0 && !searchParams.funded && (
        <p className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600">
          <Wallet className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" /> Add a budget to go live. Clippers can only join funded campaigns.
        </p>
      )}

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
            <CardHeader title="Moments to clip" description="Pin timestamps from your stream so clippers know what to cut." />
            <MomentBoard moments={detail.moments} showClaimers empty="No moments pinned yet." />
            {!ended && (
              <div className="mt-5 border-t border-zinc-100 pt-5">
                <MomentForm campaignId={c.id} />
              </div>
            )}
          </Card>
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

          <Card>
            <h2 className="mb-3 font-semibold tracking-tight">Brief</h2>
            {c.brief && <p className="mb-4 text-sm leading-relaxed text-zinc-600">{c.brief}</p>}
            <RequirementList items={c.requirements} />
            {(c.asset_folder_url || (c.reference_items?.length ?? 0) > 0) && (
              <div className="mt-5">
                <p className="mb-2 text-[13px] font-medium text-zinc-700">References</p>
                <ReferenceList campaign={c} />
              </div>
            )}
          </Card>

          <details className="group rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Store className="size-4 text-zinc-400" /> Merch store <span className="font-normal text-zinc-400">· optional</span>
              </span>
              <ChevronDown className="size-4 text-zinc-400 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <p className="mb-3 text-xs text-zinc-500">Orders using a clipper’s code are credited to them.</p>
              {shopDomain ? <StorefrontStatus shopDomain={shopDomain} /> : <ConnectStoreForm campaignId={c.id} />}
            </div>
          </details>
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

function StatusActions({ campaign }: { campaign: Campaign }) {
  if (campaign.status === 'completed') return null;
  return (
    <>
      {campaign.status !== 'active' && (
        <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
          {campaign.status === 'paused' ? 'Resume' : 'Go live'}
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
