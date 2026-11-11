import Link from 'next/link';
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
                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
                      <p className="mt-0.5 text-sm text-zinc-500">{c.brandName}</p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold tabular-nums">{r.rate}</span>
                      <span className="text-sm text-zinc-500">{r.unit}</span>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                      {s ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <SubmissionBadge status={s.status} />
                            <p className="mt-1 text-xs text-zinc-500">
                              {clips.length} {clips.length === 1 ? 'clip' : 'clips'} · {compact(views)} views
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-zinc-500">Earned</p>
                            <p className="font-semibold tabular-nums">{usd(earned)}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-[rgb(var(--brand-ta))]">No clip yet. Post one →</p>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>{usdCompact(c.budget.available)} left to earn</span>
                        <span>{Math.round(100 - used)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(used, 1.5)}%` }} />
                      </div>
                    </div>
                    <PlatformChips platforms={c.platforms} />
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
