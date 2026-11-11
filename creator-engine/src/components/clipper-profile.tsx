import Link from 'next/link';
import { Check, Pencil } from 'lucide-react';
import type { ClipperProfile } from '@/lib/data';
import { compact, usd, usdCompact } from '@/lib/format';
import { TIER_LABEL, TIER_RULES, approvalRate, nextTierProgress } from '@/lib/tiers';
import type { Platform } from '@/lib/types';
import { PlatformIcon } from './platform-icon';
import { StreamerAvatar } from './views';
import { ClipperCard } from './clipper-card';
import { TierBadge, TierEmblem } from './tier-badge';


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
          <span className="relative w-fit shrink-0">
            <StreamerAvatar name={p.name} size="lg" src={p.avatar} />
            <span className="absolute -bottom-2 -right-3 scale-75">
              <TierEmblem tier={p.tier} size={40} founder={p.founder} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{p.name}</h1>
              {own && (
                <Link href="/account" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium transition hover:bg-zinc-50">
                  <Pencil className="size-3.5" /> Edit profile
                </Link>
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: p.founder ? '#10b981' : undefined }}>
              {p.founder ? `Founding clipper #${String(p.founder).padStart(3, '0')} · ` : ''}
              {TIER_LABEL[p.tier]}
            </p>
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

      <section className="mx-auto w-full max-w-sm">
        <ClipperCard name={p.name} tier={p.tier} founder={p.founder} views={p.record.views} clips={p.record.approved} joinedAt={p.joinedAt} />
        {own && !p.founder && <p className="mt-2 text-center text-xs text-zinc-500">Your card levels up with your tier.</p>}
      </section>

      {own && (
        <div>
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
