import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store, Users } from 'lucide-react';
import { getCampaignDetail, type SubmissionRow } from '@/lib/data';
import { compact, payoutModelLabel, percent, termsLabel, timeAgo, usd } from '@/lib/format';
import { releasePayout, reviewSubmission, setCampaignStatus } from '@/actions/brand';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { ActionButton } from '@/components/action-button';
import { CampaignBadge, FraudBadge, SubmissionBadge } from '@/components/status';
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
                <SubmissionItem key={s.id} s={s} cap={c.cpm_cap} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Fund escrow" description="Card or ACH via Stripe. Creators are paid from this balance." />
            <FundEscrowForm campaignId={c.id} />
          </Card>
          <Card>
            <CardHeader title="Storefront" description="Orders from this store are matched to creator codes and links." />
            {shopDomain ? (
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3.5 py-3">
                <Store className="size-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 break-all text-sm font-medium">{shopDomain}</span>
                <Badge tone="green">Connected</Badge>
              </div>
            ) : (
              <ConnectStoreForm campaignId={c.id} />
            )}
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

function SubmissionItem({ s, cap }: { s: SubmissionRow; cap: number }) {
  const ratio = s.current_view_count > 0 ? s.current_comment_count / s.current_view_count : 0;
  const owed = s.payout_earned - s.payout_transferred;
  return (
    <li className="rounded-2xl border border-zinc-200/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={s.video_url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
            {s.creator_name}
          </a>
          <p className="mt-0.5 text-xs text-zinc-500">TikTok · synced {timeAgo(s.last_synced_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <SubmissionBadge status={s.status} />
          {s.fraud_score > 0 && <FraudBadge score={s.fraud_score} />}
        </div>
      </div>

      {s.flag_reason && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{s.flag_reason}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {[
          ['Views', compact(s.current_view_count)],
          ['Comment rate', percent(ratio)],
          ['Orders', String(s.current_conversions)],
          ['Earned', usd(s.payout_earned)],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={s.payout_earned} max={cap} />
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">{usd(s.payout_transferred)} paid</span>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4 empty:hidden">
          {s.status === 'pending_review' && (
            <>
              <ActionButton variant="primary" action={reviewSubmission.bind(null, s.id, 'approve')}>Approve</ActionButton>
              <ActionButton variant="danger" action={reviewSubmission.bind(null, s.id, 'flag')}>Flag</ActionButton>
            </>
          )}
          {s.status === 'live_tracking' && (
            <>
              {owed >= 1 && <ActionButton variant="primary" action={releasePayout.bind(null, s.id)}>Pay {usd(owed)}</ActionButton>}
              <ActionButton variant="danger" action={reviewSubmission.bind(null, s.id, 'flag')}>Flag</ActionButton>
            </>
          )}
          {s.status === 'flagged' && <ActionButton action={reviewSubmission.bind(null, s.id, 'approve')}>Clear flag</ActionButton>}
      </div>
    </li>
  );
}
