import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { getCampaignDetail, type SubmissionRow } from '@/lib/data';
import { compact, payoutModelLabel, rateParts, usd, usdCompact } from '@/lib/format';
import { isDemo } from '@/lib/env';
import { achEnabled, feeFor } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelCampaign, createDepositIntent, payDemoDeposit, releasePayout, reviewSubmission, setCampaignStatus, simulateSale, simulateSync } from '@/actions/brand';
import { Card, CardHeader } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { ActionButton } from '@/components/action-button';
import { CampaignBadge } from '@/components/status';
import { BudgetMeter, CampaignCover, DemoBar, MomentBoard, PlatformChips, ReferenceList, RequirementList, StorefrontStatus, SubmissionTable, submissionActionKinds } from '@/components/views';
import { MomentForm } from '@/components/forms/moment-form';
import { ConnectStoreForm } from '@/components/forms/campaign-forms';
import { AppAddBudget } from '@/components/checkout/app-checkout';
import { CancelCampaign, type CancelSummary } from '@/components/cancel-campaign';
import type { Campaign } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { funded?: string } }) {
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

  return (
    <div className="space-y-6">
      <Link href="/streamer" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>

      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <CampaignCover campaign={c} brandName="" variant="card" showTitle={false} className="rounded-xl" />
        <div className="min-w-0">
          <CampaignBadge status={c.status} />
          <h1 className="balance mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {payoutModelLabel[c.payout_model]} · {r.rate} {r.unit} · {r.terms}
          </p>
          <PlatformChips platforms={c.platforms} className="mt-2" />
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusActions campaign={c} />
            {c.status !== 'draft' || c.escrow_balance > 0 ? <CancelCampaign summary={cancel} ended={ended} onConfirm={cancelCampaign.bind(null, c.id)} /> : null}
          </div>
        </div>
      </div>

      {isDemo && !ended && (
        <DemoBar>
          <ActionButton action={simulateSync.bind(null, c.id)}>Run 4h sync</ActionButton>
          {shopDomain && <ActionButton action={simulateSale.bind(null, c.id)}>Simulate merch order</ActionButton>}
        </DemoBar>
      )}

      {searchParams.funded && <p className="rounded-lg bg-accent-50 px-4 py-3 text-sm text-accent-700">Payment received. Escrow updates as soon as Stripe confirms it.</p>}

      <StatGrid
        items={[
          { label: 'Budget left', value: usd(c.escrow_balance), hint: `${usdCompact(deposited + refunded)} added, ${usdCompact(fees)} fee${refunded > 0 ? `, ${usdCompact(refunded)} refunded` : ''}` },
          { label: 'Paid to clippers', value: usd(paidOut), hint: 'Clippers keep 100%' },
          { label: 'Verified views', value: compact(submissions.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Merch orders', value: compact(submissions.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="order-2 min-w-0 space-y-6">
          <Card>
            <CardHeader title="Clips" description={`Views sync every 4 hours. Approve each clip yourself. Approved clips are paid automatically after 3 days; you can flag one until then.`} />
            {submissions.length === 0 ? (
              <Empty icon={<Users />} title="No clips yet" body="Clips show up here as soon as clippers post them." />
            ) : (
              <SubmissionTable rows={submissions} cap={c.cpm_cap} actions={(s) => <SubmissionActions s={s} ended={ended} />} />
            )}
          </Card>
          <Card>
            <CardHeader title="Moments to clip" description="Pin timestamps from your stream. Slots stop everyone cutting the same moment." />
            <MomentBoard moments={detail.moments} showClaimers empty="No moments pinned yet." />
            {!ended && (
              <div className="mt-5 border-t border-zinc-100 pt-5">
                <MomentForm campaignId={c.id} />
              </div>
            )}
          </Card>
        </div>

        <div className="order-1 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
          <Card>
            <CardHeader title="Budget" description={ended ? 'Campaign ended' : `${usd(budget.available)} free to earn`} />
            <BudgetMeter budget={budget} />
            <div className="mt-5 border-t border-zinc-100 pt-5">
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
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    {plan.early
                      ? 'Early partner: no service fee, only Stripe’s card processing. Cancel anytime: unspent budget is refunded.'
                      : `${feePercent}% service fee on top (covers card processing). Cancel anytime: unspent budget is refunded, the fee isn’t.`}
                  </p>
                </>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Merch store" description="Optional. Orders using a clipper’s code are credited to them." />
            {shopDomain ? <StorefrontStatus shopDomain={shopDomain} /> : <ConnectStoreForm campaignId={c.id} />}
          </Card>
          <Card>
            <CardHeader title="Brief" />
            {c.brief && <p className="mb-5 text-sm leading-relaxed text-zinc-600">{c.brief}</p>}
            <RequirementList items={c.requirements} />
            {(c.asset_folder_url || (c.reference_items?.length ?? 0) > 0) && (
              <div className="mt-5">
                <p className="mb-2 text-[13px] font-medium text-zinc-700">References</p>
                <ReferenceList campaign={c} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusActions({ campaign }: { campaign: Campaign }) {
  if (campaign.status === 'completed') return null;
  return (
    <>
      {campaign.status !== 'active' && (
        <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
          Go live
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
