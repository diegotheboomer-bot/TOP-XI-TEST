import Link from 'next/link';
import { Check } from 'lucide-react';
import type { ClipperProfile } from '@/lib/data';
import { compact, usd, usdCompact } from '@/lib/format';
import { TIERS, TIER_LABEL, TIER_PERKS, holdLabel, TIER_RULES, approvalRate, nextTierProgress, tierRank, type Tier } from '@/lib/tiers';
import type { Platform } from '@/lib/types';
import { PlatformIcon } from './platform-icon';
import { StreamerAvatar } from './views';
import { TierBadge, TierEmblem } from './tier-badge';
import { TierLadder } from './tier-progress';
import { cn } from './ui/cn';

const perkLines = (t: Tier) => {
  const p = TIER_PERKS[t];
  return [
    `${p.feePct}% payout fee`,
    p.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${p.cashoutsPerWeek} cash-out${p.cashoutsPerWeek === 1 ? '' : 's'} a week`,
    `Paid ${holdLabel(p.holdHours)} after approval`,
    ...(t === 'silver' ? ['Join any open campaign'] : [`${TIER_LABEL[t]}-only campaigns`, 'Reviewed first by streamers']),
  ];
};

/** A clipper's tier, record and campaigns. `own` adds tier progress and the perks table. */
export function ClipperProfileView({ p, own = false, campaignHref }: { p: ClipperProfile; own?: boolean; campaignHref: (id: string) => string }) {
  const next = own ? nextTierProgress(p.record) : null;
  const rate = Math.round(approvalRate(p.record) * 100);
  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" style={{ background: 'radial-gradient(70% 100% at 0% 0%, rgb(var(--brand-a) / 0.18), transparent 70%)' }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <TierEmblem tier={p.tier} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{p.name}</h1>
              <TierBadge tier={p.tier} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
              {p.handles.length ? (
                p.handles.map((h) => (
                  <a key={h.platform} href={h.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-zinc-900 hover:underline">
                    <PlatformIcon platform={h.platform as Platform} className="size-3.5" />
                    {h.handle}
                  </a>
                ))
              ) : (
                <span>No accounts connected yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-6">
          <TierLadder record={p.record} />
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-100 bg-zinc-100 sm:grid-cols-4">
          {[
            ['Verified views', compact(p.record.views)],
            ['Approved clips', String(p.record.approved)],
            ['Approval rate', `${rate}%`],
            ['Earned', usdCompact(p.earned)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-[11px] text-zinc-500">{k}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {own && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Progress to the next tier */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
            {next ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold tracking-tight">Next: {TIER_LABEL[next.next]}</h2>
                  <TierBadge tier={next.next} />
                </div>
                <ul className="mt-4 space-y-4">
                  {next.items.map((it) => {
                    const done = it.have >= it.need;
                    const pct = it.need ? Math.min(100, (it.have / it.need) * 100) : 100;
                    const fmt = (n: number) => (it.label === 'Approval rate' ? `${n}%` : it.label === 'Verified views' ? compact(n) : String(n));
                    return (
                      <li key={it.label}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            {done && <Check className="size-3.5 text-[rgb(var(--brand-ta))]" strokeWidth={3} />}
                            {it.label}
                          </span>
                          <span className="tabular-nums text-zinc-500">
                            <span className="font-semibold text-zinc-900">{fmt(it.have)}</span> / {fmt(it.need)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                  {TIER_RULES[next.next].noFraud && <li className="text-xs text-zinc-500">Plus no fraud flags in the last 90 days.</li>}
                </ul>
              </>
            ) : (
              <>
                <h2 className="font-semibold tracking-tight">You’re at the top</h2>
                <p className="mt-1 text-sm text-zinc-500">Majesty is the highest tier. Keep your approval rate up to stay here.</p>
              </>
            )}
          </section>

          {/* Perks per tier */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-semibold tracking-tight">Tier perks</h2>
            <ul className="mt-4 space-y-3">
              {TIERS.map((t) => {
                const on = t === p.tier;
                const reached = tierRank(t) <= tierRank(p.tier);
                return (
                  <li key={t} className={cn('rounded-xl border px-3.5 py-3', on ? 'border-brand-b/60 bg-brand-a/10' : 'border-zinc-200', !reached && 'opacity-70')}>
                    <div className="flex items-center justify-between">
                      <TierBadge tier={t} />
                      {on && <span className="text-[11px] font-semibold text-[rgb(var(--brand-ta))]">You</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-600">{perkLines(t).join(' · ')}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {/* Campaigns */}
      <section>
        <h2 className="mb-3 font-semibold tracking-tight">{own ? 'Your campaigns' : 'On your campaigns'}</h2>
        {p.campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">No clips yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
            {p.campaigns.map((c) => (
              <li key={c.id}>
                <Link href={campaignHref(c.id)} className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="h-10 w-16 shrink-0 rounded-md" style={{ backgroundColor: c.cover_color }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                      <StreamerAvatar name={c.brandName} /> {c.brandName}
                      {c.agencyName && <span>· via {c.agencyName}</span>}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p className="text-sm font-semibold tabular-nums text-zinc-900">{usd(c.earned)}</p>
                    {c.clips} {c.clips === 1 ? 'clip' : 'clips'} · {compact(c.views)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
