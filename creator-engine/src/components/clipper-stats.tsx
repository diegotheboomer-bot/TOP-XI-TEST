// Clipper "Clips" and "Earnings" pages: everything from the clipper's submissions.
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { CreatorDashboard } from '@/lib/data';
import type { Submission, SubmissionStatus } from '@/lib/types';
import { holdHoursLeft } from '@/lib/payout-rules';
import { compact, usd, usdCents } from '@/lib/format';
import { PlatformTile } from './platform-icon';
import { SubmissionBadge } from './status';
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

export function ClipsView({ d, tab, history }: { d: CreatorDashboard; tab: string; history: { day: string; views: number }[] }) {
  const rows = rowsOf(d);
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const shown = rows.filter((r) => active.match(r.sub.status));
  const views = rows.reduce((n, r) => n + r.sub.current_view_count, 0);
  const likes = rows.reduce((n, r) => n + r.sub.current_like_count, 0);
  const earned = rows.reduce((n, r) => n + r.sub.payout_earned, 0);
  const weekAgo = history.length > 7 ? history[history.length - 8].views : 0;
  const week = history.length > 7 ? Math.max(0, views - weekAgo) : null;
  return (
    <div className="space-y-6">
      {/* Views over time */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-brand opacity-[0.08] blur-3xl" />
        <div className="relative p-5 sm:p-6">
          <p className="text-sm text-zinc-500">Total views</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="text-5xl font-semibold tabular-nums tracking-tight">{compact(views)}</p>
            {week != null && week > 0 && <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-ink">+{compact(week)} this week</span>}
          </div>
        </div>
        <Spark points={history.map((h) => h.views)} />
        <div className="grid grid-cols-3 divide-x divide-zinc-200/80 border-t border-zinc-200/80">
          {[
            ['Clips', String(rows.length)],
            ['Likes', compact(likes)],
            ['Earned', usd(earned)],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-3.5 sm:px-6">
              <p className="text-xs text-zinc-500">{k}</p>
              <p className={cn('mt-0.5 text-lg font-semibold tabular-nums tracking-tight', k === 'Earned' && 'text-brand')}>{v}</p>
            </div>
          ))}
        </div>
      </div>

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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map(({ sub, campaignTitle, brandName }) => (
            <li key={sub.id}>
              <a href={sub.video_url} target="_blank" rel="noreferrer" className="group block">
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-100">
                  {coverOf(sub) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverOf(sub)!} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="hero-grid absolute inset-0" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgb(0_0_0/0.75)] via-transparent to-[rgb(0_0_0/0.25)]" />
                  <div className="absolute left-2 top-2">
                    <PlatformTile platform={sub.platform} className="size-7 rounded-lg" iconClassName="size-3.5" />
                  </div>
                  <div className="absolute right-2 top-2">
                    <SubmissionBadge status={sub.status} />
                  </div>
                  <div className="absolute inset-x-3 bottom-3 text-[#fff]">
                    <p className="text-xl font-semibold tabular-nums tracking-tight">{compact(sub.current_view_count)}</p>
                    <p className="text-[11px] text-[rgb(255_255_255/0.75)]">views</p>
                  </div>
                </div>
                <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{campaignTitle}</p>
                    <p className="truncate text-xs text-zinc-500">{brandName}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-brand">{usdCents(sub.payout_earned)}</p>
                </div>
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

/** The clip's cover: saved by the sync, or YouTube's own thumbnail. */
function coverOf(sub: Submission): string | null {
  if (sub.cover_url) return sub.cover_url;
  if (sub.platform === 'youtube') return `https://i.ytimg.com/vi/${sub.social_platform_video_id}/hqdefault.jpg`;
  return null;
}

/** Area chart of daily total views, edge to edge. */
function Spark({ points }: { points: number[] }) {
  if (points.length < 2 || Math.max(...points) === 0) return <div className="h-4" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 100;
  const h = 40;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - ((p - min) / span) * (h - 6) - 3]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-24 w-full" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-b))', stopOpacity: 0.35 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id="spark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))' }} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h}Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="url(#spark-line)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
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
      {/* Where the money is: one bar split into paid, on the way and held */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="flex h-3 gap-1 overflow-hidden rounded-full bg-zinc-100">
          {[
            [paid, 'bg-brand'],
            [owed, 'bg-brand opacity-40'],
            [held, 'bg-rose-600/70'],
          ].map(([v, cls], i) =>
            (v as number) > 0 ? <div key={i} className={cn('h-full rounded-full', cls as string)} style={{ flexGrow: v as number }} /> : null,
          )}
        </div>
        <ul className="mt-5 space-y-3.5">
          {(
            [
              ['Paid out', paid, 'bg-brand', 'In your account'],
              ['On the way', owed, 'bg-brand opacity-40', 'Sent every Friday'],
              ['Held', held, 'bg-rose-600/70', 'Flagged clips, under review'],
            ] as const
          ).map(([label, v, dot, hint]) => (
            <li key={label} className="flex items-center gap-3">
              <span className={cn('size-2.5 shrink-0 rounded-full', dot)} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-zinc-500">{hint}</span>
              </span>
              <span className="text-lg font-semibold tabular-nums tracking-tight">{usdCents(v)}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/clipper/payouts"
          className="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm transition hover:bg-zinc-100"
        >
          <span className="text-zinc-500">Payout method</span>
          <span className={cn('flex items-center gap-1.5 font-medium', d.payoutsEnabled ? 'text-[rgb(var(--brand-ta))]' : 'text-amber-700')}>
            {d.payoutsEnabled ? 'Ready' : 'Set it up'} <ArrowUpRight className="size-3.5" />
          </span>
        </Link>
      </div>
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
