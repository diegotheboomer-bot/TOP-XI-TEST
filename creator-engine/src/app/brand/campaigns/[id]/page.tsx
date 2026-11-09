import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { getCampaignDetail, type SubmissionRow } from '@/lib/data';
import { compact, payoutModelLabel, termsLabel, usd } from '@/lib/format';
import { isDemo } from '@/lib/env';
import { releasePayout, reviewSubmission, setCampaignStatus, simulateSale, simulateSync } from '@/actions/brand';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { ActionButton } from '@/components/action-button';
import { CampaignBadge } from '@/components/status';
import { DemoBar, StorefrontStatus, SubmissionCard, submissionActionKinds } from '@/components/views';
import { ConnectStoreForm, FundEscrowForm } from '@/components/forms/campaign-forms';
import type { Campaign } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { funded?: string } }) {
  const detail = await getCampaignDetail(params.id);
  if (!detail) notFound();
  const { campaign: c, submissions, shopDomain, deposited, paidOut, fees } = detail;

  return (
    <>
      <Link href="/brand" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>
      <PageHeader
        eyebrow={<CampaignBadge status={c.status} />}
        title={c.title}
        description={`${payoutModelLabel[c.payout_model]} · ${termsLabel(c)}`}
        actions={<StatusActions campaign={c} />}
      />

      {isDemo && (
        <DemoBar>
          <ActionButton action={simulateSync.bind(null, c.id)}>Run 4h sync</ActionButton>
          <ActionButton action={simulateSale.bind(null, c.id)}>Simulate sale</ActionButton>
        </DemoBar>
      )}

      {searchParams.funded && (
        <p className="mb-6 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">Payment received — escrow updates as soon as Stripe confirms it.</p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Escrow balance" value={usd(c.escrow_balance)} hint={`${usd(deposited)} deposited`} />
        <Stat label="Paid out" value={usd(paidOut)} hint={`${usd(fees)} platform fees`} />
        <Stat label="Verified views" value={compact(submissions.reduce((a, s) => a + s.current_view_count, 0))} />
        <Stat label="Orders" value={compact(submissions.reduce((a, s) => a + s.current_conversions, 0))} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="Submissions" description="Views sync from TikTok every 4 hours. Flagged videos stop earning." />
          {submissions.length === 0 ? (
            <Empty icon={<Users />} title="No submissions yet" body="Creators who join appear here once they submit a live video." />
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => (
                <SubmissionCard key={s.id} s={s} cap={c.cpm_cap} actions={<SubmissionActions s={s} />} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Fund escrow"
              description={isDemo ? 'Mock money — adds to escrow instantly.' : 'Card or ACH via Stripe. Creators are paid from this balance.'}
            />
            <FundEscrowForm campaignId={c.id} />
          </Card>
          <Card>
            <CardHeader title="Storefront" description="Orders from this store are matched to creator codes and links." />
            {shopDomain ? <StorefrontStatus shopDomain={shopDomain} /> : <ConnectStoreForm campaignId={c.id} />}
          </Card>
        </div>
      </div>
    </>
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
      {campaign.status !== 'draft' && <ActionButton action={setCampaignStatus.bind(null, campaign.id, 'completed')}>Complete</ActionButton>}
    </>
  );
}

function SubmissionActions({ s }: { s: SubmissionRow }) {
  const kinds = submissionActionKinds(s);
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
