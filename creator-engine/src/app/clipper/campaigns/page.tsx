import Link from 'next/link';
import { PlatformIcon } from '@/components/platform-icon';
import { Compass, FolderOpen } from 'lucide-react';
import { getJoinedCampaigns } from '@/lib/data';
import { compact, rateParts, usd, usdCompact } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { CampaignCover, PlatformChips } from '@/components/views';
import { CampaignBadge, SubmissionBadge } from '@/components/status';

export const dynamic = 'force-dynamic';

export default async function MyCampaignsPage() {
  const joined = await getJoinedCampaigns();
  return (
    <>
      <PageHeader title="My campaigns" description="Everything you’ve joined, with your clip and what it’s earned." />
      {joined.length === 0 ? (
        <Empty
          icon={<FolderOpen />}
          title="You haven’t joined a campaign yet"
          body="Find one you like in Discover and join it. It shows up here."
          action={
            <Link href="/clipper/discover" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink">
              <Compass className="size-4" /> Go to Discover
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {joined.map(({ campaign: c, submissions: clips }) => {
            const s = clips[0] ?? null;
            const earned = clips.reduce((n, x) => n + x.payout_earned, 0);
            const views = clips.reduce((n, x) => n + x.current_view_count, 0);
            const r = rateParts(c);
            const used = c.budget.deposited > 0 ? Math.min(100, (c.budget.committed / c.budget.deposited) * 100) : 0;
            return (
              <li key={c.id}>
                <Link href={`/clipper/campaigns/${c.id}`} className="group block h-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card transition hover:border-zinc-300">
                  <div className="relative">
                    <CampaignCover campaign={c} brandName="" showTitle={false} />
                    <span className="absolute left-3 top-3">
                      <CampaignBadge status={c.status} />
                    </span>
                  </div>
                  <div className="relative p-4">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32" style={{ background: 'radial-gradient(70% 100% at 0% 0%, rgb(var(--brand-a) / 0.10), transparent 75%)' }} />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
                        <p className="truncate text-sm text-zinc-500">{c.brandName}</p>
                      </div>
                      <span className="flex shrink-0 gap-1.5 pt-1 text-zinc-400">
                        {c.platforms.map((p) => (
                          <PlatformIcon key={p} platform={p} className="size-3.5" />
                        ))}
                      </span>
                    </div>
                    <p className="relative mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold tabular-nums tracking-tight">{c.payout_model === 'pool' ? usdCompact(c.budget.deposited) : r.rate}</span>
                      <span className="text-sm text-zinc-500">{c.payout_model === 'pool' ? 'pool, split by views' : r.unit}</span>
                    </p>
                    {/* Your numbers in one divided row */}
                    <dl className="relative mt-3 grid grid-cols-3 divide-x divide-zinc-100 border-y border-zinc-100 py-2.5 text-center">
                      <div>
                        <dd className="text-sm font-semibold tabular-nums">{clips.length}</dd>
                        <dt className="text-[11px] text-zinc-500">{clips.length === 1 ? 'clip' : 'clips'}</dt>
                      </div>
                      <div>
                        <dd className="text-sm font-semibold tabular-nums">{compact(views)}</dd>
                        <dt className="text-[11px] text-zinc-500">views</dt>
                      </div>
                      <div>
                        <dd className="text-sm font-semibold tabular-nums text-brand">{usd(earned)}</dd>
                        <dt className="text-[11px] text-zinc-500">earned</dt>
                      </div>
                    </dl>
                    <div className="relative mt-3 flex items-center justify-between gap-2 text-xs">
                      {s ? <SubmissionBadge status={s.status} /> : <span className="font-semibold text-[rgb(var(--brand-ta))]">No clip yet · Post one →</span>}
                      {c.payout_model !== 'pool' && <span className="text-zinc-500">{usdCompact(c.budget.available)} left</span>}
                    </div>
                    {c.payout_model !== 'pool' && (
                      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(used, 1.5)}%` }} />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
