// Presentational building blocks shared by the Next.js pages and the standalone demo.
// No Next.js imports here: callers pass links and action buttons in as props.
import { ArrowUpRight, BadgeCheck, Clock, Store } from 'lucide-react';
import type { CampaignSummary, SubmissionRow } from '@/lib/data';
import type { Campaign, Enrollment, Submission } from '@/lib/types';
import { compact, payoutModelLabel, percent, termsLabel, timeAgo, usd } from '@/lib/format';
import { trackingLink } from '@/lib/attribution';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { CopyField } from './copy-button';
import { CampaignBadge, FraudBadge, SubmissionBadge } from './status';

/** Body of a campaign row on the brand dashboard. The caller wraps it in a link. */
export function CampaignRow({ c }: { c: CampaignSummary }) {
  return (
    <Card className="grid gap-5 transition group-hover:border-zinc-300 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
          <CampaignBadge status={c.status} />
        </div>
        <p className="mt-1 truncate text-sm text-zinc-500">
          {payoutModelLabel[c.payout_model]} · {termsLabel(c)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Creators', String(c.submissions)],
          ['Views', compact(c.views)],
          ['Orders', compact(c.conversions)],
          ['Escrow', usd(c.escrow_balance)],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-zinc-500">{k}</dt>
            <dd className="mt-0.5 truncate font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <ArrowUpRight className="hidden size-5 text-zinc-400 transition group-hover:text-zinc-900 md:block" />
    </Card>
  );
}

/** One creator's submission on the brand's campaign page. */
export function SubmissionCard({ s, cap, actions }: { s: SubmissionRow; cap: number; actions?: React.ReactNode }) {
  const ratio = s.current_view_count > 0 ? s.current_comment_count / s.current_view_count : 0;
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

      {actions && <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">{actions}</div>}
    </li>
  );
}

/** Which review / payout buttons a submission gets, given its state. */
export function submissionActionKinds(s: Submission): ('approve' | 'flag' | 'pay' | 'clear')[] {
  if (s.status === 'pending_review') return ['approve', 'flag'];
  if (s.status === 'live_tracking') return s.payout_earned - s.payout_transferred >= 1 ? ['pay', 'flag'] : ['flag'];
  if (s.status === 'flagged') return ['clear'];
  return [];
}

export function StorefrontStatus({ shopDomain }: { shopDomain: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3.5 py-3">
      <Store className="size-4 shrink-0 text-zinc-500" />
      <span className="min-w-0 flex-1 break-all text-sm font-medium">{shopDomain}</span>
      <Badge tone="green">Connected</Badge>
    </div>
  );
}

export function ConnectionCard({ icon, title, connected, detail, action }: { icon: React.ReactNode; title: string; connected: boolean; detail: string; action: React.ReactNode }) {
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

/** A campaign the creator joined: their code, link, and either progress or the submit form. */
export function EnrollmentCard({
  enrollment,
  campaign,
  brandName,
  shopDomain,
  submission,
  submitForm,
}: {
  enrollment: Enrollment;
  campaign: Campaign;
  brandName: string;
  shopDomain: string | null;
  submission: Submission | null;
  submitForm: React.ReactNode;
}) {
  const link = trackingLink(shopDomain, enrollment.ref_param);
  return (
    <Card className="flex min-w-0 flex-col gap-5">
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
        submitForm
      )}
    </Card>
  );
}

export function OpenCampaignCard({ c, action }: { c: Campaign & { brandName: string }; action: React.ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col justify-between gap-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500">{c.brandName}</p>
        <h3 className="mt-0.5 truncate font-semibold tracking-tight">{c.title}</h3>
        <p className="mt-1 text-sm text-zinc-500">{termsLabel(c)}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge tone="green">{usd(c.escrow_balance)} in escrow</Badge>
        {action}
      </div>
    </Card>
  );
}

export function DemoBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
      <p className="text-sm text-amber-800">Demo controls — fake data, mock money.</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
