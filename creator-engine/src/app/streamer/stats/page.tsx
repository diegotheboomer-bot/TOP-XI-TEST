import Link from 'next/link';
import { getStreamerStats } from '@/lib/data';
import { compact, usd, usdCents } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Spark } from '@/components/clipper-stats';
import { PlatformIcon } from '@/components/platform-icon';
import { CampaignBadge } from '@/components/status';
import { cn } from '@/components/ui/cn';
import type { CampaignStatus, Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PLATFORMS: [Platform | 'all', string][] = [
  ['all', 'All'],
  ['tiktok', 'TikTok'],
  ['youtube', 'Shorts'],
  ['instagram', 'Reels'],
];

export default async function StatsPage({ searchParams }: { searchParams: { platform?: string } }) {
  const platform = PLATFORMS.some(([p]) => p === searchParams.platform && p !== 'all') ? searchParams.platform : undefined;
  const s = await getStreamerStats(platform);
  const ecpm = s.views > 0 ? (s.spend / s.views) * 1000 : null;
  const week = s.history.length > 7 ? Math.max(0, s.views - s.history[s.history.length - 8].views) : 0;
  return (
    <div className="space-y-6">
      <PageHeader title="Stats" description="Is it working? Views, spend and what you pay per 1,000 views, across your campaigns." />

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Platform">
        {PLATFORMS.map(([p, label]) => {
          const on = (platform ?? 'all') === p;
          return (
            <Link
              key={p}
              href={p === 'all' ? '/streamer/stats' : `/streamer/stats?platform=${p}`}
              className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition', on ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900')}
            >
              {p !== 'all' && <PlatformIcon platform={p} className="size-3.5" />}
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-brand opacity-[0.08] blur-3xl" />
        <div className="relative p-5 sm:p-6">
          <p className="text-sm text-zinc-500">Views</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="text-5xl font-semibold tabular-nums tracking-tight">{compact(s.views)}</p>
            {week > 0 && <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-ink">+{compact(week)} this week</span>}
          </div>
        </div>
        <Spark points={s.history.map((h) => h.views)} />
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200/80 border-t border-zinc-200/80 sm:grid-cols-4 sm:divide-y-0">
          {[
            ['Spend', usdCents(s.spend), 'earned by clippers'],
            ['Cost per 1K views', ecpm != null ? usdCents(ecpm) : '—', 'what each 1K views cost you'],
            ['Paid out', usdCents(s.paid), 'already sent'],
            ['Clips', String(s.clips), 'submitted'],
          ].map(([k, v, h]) => (
            <div key={k} className="px-4 py-3.5 sm:px-6">
              <p className="text-xs text-zinc-500">{k}</p>
              <p className={cn('mt-0.5 text-lg font-semibold tabular-nums tracking-tight', k === 'Cost per 1K views' && 'text-brand')}>{v}</p>
              <p className="truncate text-[11px] text-zinc-400">{h}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-semibold tracking-tight">By campaign</h2>
        {s.campaigns.length ? (
          <ul className="divide-y divide-zinc-200/80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
            {s.campaigns.map((c) => (
              <li key={c.id}>
                <Link href={`/streamer/campaigns/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-50 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-xs tabular-nums text-zinc-500">
                      {compact(c.views)} views · {c.clips} clips · {c.views ? `${usdCents((c.spend / c.views) * 1000)} per 1K` : 'no views yet'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{usd(c.spend)}</span>
                  <CampaignBadge status={c.status as CampaignStatus} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-zinc-200 px-6 py-12 text-center text-sm text-zinc-500">
            No campaigns yet. <Link href="/streamer/campaigns/new" className="font-medium text-zinc-900 underline">Create one</Link> and its stats show up here.
          </p>
        )}
      </section>
    </div>
  );
}
