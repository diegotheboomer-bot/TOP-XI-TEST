// Clipper "Clips" and "Earnings" pages: everything from the clipper's submissions.
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { CreatorDashboard } from '@/lib/data';
import type { Submission, SubmissionStatus } from '@/lib/types';
import { holdHoursLeft } from '@/lib/payout-rules';
import { compact, usd, usdCents } from '@/lib/format';
import { PlatformTile } from './platform-icon';
import { SubmissionBadge } from './status';
import { StatGrid } from './ui/stat';
import { cn } from './ui/cn';

type Row = { sub: Submission; campaignTitle: string; brandName: string; cap: number; campaignId: string };

export function rowsOf(d: CreatorDashboard): Row[] {
  return d.enrollments
    .filter((e) => e.submission)
    .map((e) => ({ sub: e.submission!, campaignTitle: e.campaign.title, brandName: e.brandName, cap: e.campaign.cpm_cap, campaignId: e.campaign.id }))
    .sort((a, b) => b.sub.created_at.localeCompare(a.sub.created_at));
}

const TABS: { key: string; label: string; match: (s: SubmissionStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'live', label: 'Live', match: (s) => s === 'live_tracking' },
  { key: 'review', label: 'In review', match: (s) => s === 'pending_review' },
  { key: 'paid', label: 'Paid', match: (s) => s === 'paid' },
  { key: 'flagged', label: 'Flagged', match: (s) => s === 'flagged' },
];

export function ClipsView({ d, tab }: { d: CreatorDashboard; tab: string }) {
  const rows = rowsOf(d);
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const shown = rows.filter((r) => active.match(r.sub.status));
  const views = rows.reduce((n, r) => n + r.sub.current_view_count, 0);
  const likes = rows.reduce((n, r) => n + r.sub.current_like_count, 0);
  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          { label: 'Total views', value: compact(views), hint: 'across all your clips' },
          { label: 'Clips', value: String(rows.length), hint: `${rows.filter((r) => r.sub.status === 'live_tracking').length} live` },
          { label: 'Likes', value: compact(likes) },
          { label: 'Earned', value: usd(rows.reduce((n, r) => n + r.sub.payout_earned, 0)) },
        ]}
      />
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Filter clips">
        {TABS.map((t) => {
          const count = rows.filter((r) => t.match(r.sub.status)).length;
          const on = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={t.key === 'all' ? '/clipper/clips' : `/clipper/clips?tab=${t.key}`}
              className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition', on ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900')}
            >
              {t.label} <span className={cn('tabular-nums', on ? 'text-brand-ink/70' : 'text-zinc-400')}>{count}</span>
            </Link>
          );
        })}
      </nav>
      {shown.length ? (
        <ul className="divide-y divide-zinc-200/80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
          {shown.map(({ sub, campaignTitle, brandName, campaignId }) => (
            <li key={sub.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <PlatformTile platform={sub.platform} />
              <div className="min-w-0 flex-1">
                <Link href={`/clipper/campaigns/${campaignId}`} className="block truncate text-sm font-medium hover:underline">
                  {campaignTitle}
                </Link>
                <p className="truncate text-xs text-zinc-500">
                  {brandName} · <span className="tabular-nums">{compact(sub.current_view_count)} views</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums">{usdCents(sub.payout_earned)}</span>
                <SubmissionBadge status={sub.status} />
              </div>
              <a href={sub.video_url} target="_blank" rel="noreferrer" aria-label="Open clip" className="hidden size-8 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 sm:grid">
                <ArrowUpRight className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          title={rows.length ? `No ${active.label.toLowerCase()} clips` : 'No clips yet'}
          body={rows.length ? 'Clips show up here as their status changes.' : 'Join a campaign and submit your first clip. Its views and earnings show up here.'}
        />
      )}
    </div>
  );
}

export function EarningsView({ d }: { d: CreatorDashboard }) {
  const rows = rowsOf(d);
  const earned = rows.reduce((n, r) => n + r.sub.payout_earned, 0);
  const paid = rows.reduce((n, r) => n + r.sub.payout_transferred, 0);
  const owed = rows.filter((r) => r.sub.status !== 'flagged').reduce((n, r) => n + Math.max(0, r.sub.payout_earned - r.sub.payout_transferred), 0);
  const held = rows.filter((r) => r.sub.status === 'flagged').reduce((n, r) => n + Math.max(0, r.sub.payout_earned - r.sub.payout_transferred), 0);
  const nextHold = rows
    .filter((r) => r.sub.status === 'live_tracking' && r.sub.payout_earned > r.sub.payout_transferred)
    .map((r) => holdHoursLeft(r.sub.approved_at))
    .sort((a, b) => a - b)[0];
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand opacity-[0.08] blur-3xl" />
        <p className="text-sm text-zinc-500">Total earned</p>
        <p className="mt-1 text-5xl font-semibold tabular-nums tracking-tight text-brand">{usdCents(earned)}</p>
        <p className="mt-3 text-sm text-zinc-500">
          {owed > 0
            ? nextHold != null && nextHold > 0
              ? `${usdCents(owed)} on the way. Next payout in about ${Math.ceil(nextHold / 24)} day${Math.ceil(nextHold / 24) === 1 ? '' : 's'}.`
              : `${usdCents(owed)} on the way with the next payout.`
            : 'You’re all paid up.'}
        </p>
      </div>
      <StatGrid
        items={[
          { label: 'Paid out', value: usdCents(paid) },
          { label: 'On the way', value: usdCents(owed), hint: 'paid 3 days after approval' },
          { label: 'Held', value: usdCents(held), hint: held ? 'flagged clips, under review' : 'nothing held' },
          { label: 'Payout method', value: d.payoutsEnabled ? 'Ready' : 'Not set up', hint: d.payoutsEnabled ? undefined : 'set it up to get paid' },
        ]}
      />
      <section>
        <h2 className="mb-3 font-semibold tracking-tight">By campaign</h2>
        {rows.length ? (
          <ul className="space-y-3">
            {rows.map(({ sub, campaignTitle, brandName, cap, campaignId }) => {
              const pct = cap > 0 ? Math.min(100, (sub.payout_earned / cap) * 100) : 0;
              return (
                <li key={sub.id} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card sm:p-5">
                  <div className="flex items-center gap-3">
                    <PlatformTile platform={sub.platform} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/clipper/campaigns/${campaignId}`} className="block truncate text-sm font-medium hover:underline">
                        {campaignTitle}
                      </Link>
                      <p className="truncate text-xs text-zinc-500">{brandName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{usdCents(sub.payout_earned)}</p>
                      <p className="text-xs tabular-nums text-zinc-500">{usdCents(sub.payout_transferred)} paid</p>
                    </div>
                  </div>
                  {cap > 0 && (
                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs tabular-nums text-zinc-500">
                        {Math.round(pct)}% of the {usd(cap)} cap
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="Nothing earned yet" body="Your earnings per campaign show up here once your clips get views." />
        )}
      </section>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-200 px-6 py-14 text-center">
      <span className="platform-tile relative grid size-12 place-items-center overflow-hidden rounded-xl bg-brand text-brand-ink">
        <ArrowUpRight className="relative size-5" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">{body}</p>
      <Link href="/clipper/discover" className="mt-4 text-sm font-medium underline">
        Find a campaign
      </Link>
    </div>
  );
}
