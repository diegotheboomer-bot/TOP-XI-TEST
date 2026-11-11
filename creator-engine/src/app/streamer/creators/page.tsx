import Link from 'next/link';
import { TierBadge } from '@/components/tier-badge';
import { Crown, Users } from 'lucide-react';
import { getStreamerCreators } from '@/lib/data';
import { compact, timeAgo, usdCompact } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { PlatformIcon } from '@/components/platform-icon';
import { StreamerAvatar } from '@/components/views';
import { cn } from '@/components/ui/cn';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CreatorsPage() {
  const creators = await getStreamerCreators();
  const podium = creators.slice(0, 3);
  const totalViews = creators.reduce((n, c) => n + c.views, 0);

  return (
    <>
      <PageHeader title="Creators" description="The clippers posting your streams, ranked by the views they’ve brought you." />
      {creators.length === 0 ? (
        <Empty icon={<Users />} title="No clippers yet" body="Once clippers post for your campaigns, they show up here with their views and earnings." />
      ) : (
        <div className="space-y-6">
          {/* Top three. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {podium.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  'relative overflow-hidden rounded-2xl border bg-white p-5 shadow-card',
                  i === 0 ? 'border-brand-b/50 ring-4 ring-brand-a/10' : 'border-zinc-200/80',
                )}
              >
                {i === 0 && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-24"
                    style={{ background: 'radial-gradient(80% 100% at 50% 0%, rgb(var(--brand-a) / 0.22), transparent 70%)' }}
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <span className="relative">
                    <StreamerAvatar name={c.name} size="md" />
                    <span
                      className={cn(
                        'absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full font-mono text-[10px] font-bold ring-2 ring-white',
                        i === 0 ? 'bg-brand text-brand-ink' : 'bg-zinc-200 text-zinc-700',
                      )}
                    >
                      {i === 0 ? <Crown className="size-3" /> : i + 1}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <Link href={`/streamer/clippers/${c.id}`} className="flex items-center gap-1.5 truncate font-semibold tracking-tight hover:underline">
                      {c.name} {c.tier && <TierBadge tier={c.tier} />}
                    </Link>
                    <Handles handles={c.handles} />
                  </div>
                </div>
                <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Views" value={compact(c.views)} />
                  <Metric label="Earned" value={usdCompact(c.earned)} />
                  <Metric label="Clips" value={String(c.clips)} />
                </div>
                <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${totalViews ? Math.max(4, (c.views / totalViews) * 100) : 0}%` }} />
                </div>
                <p className="relative mt-1.5 text-[11px] text-zinc-500">{totalViews ? Math.round((c.views / totalViews) * 100) : 0}% of your clip views</p>
              </div>
            ))}
          </div>

          {/* Everyone. */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
            <div className="hidden grid-cols-[2rem_minmax(0,1fr)_6rem_6rem_5rem_7rem] gap-4 border-b border-zinc-100 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400 sm:grid">
              <span>#</span>
              <span>Clipper</span>
              <span className="text-right">Views</span>
              <span className="text-right">Earned</span>
              <span className="text-right">Clips</span>
              <span className="text-right">Last clip</span>
            </div>
            <ol className="divide-y divide-zinc-100">
              {creators.map((c, i) => (
                <li key={c.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 sm:grid-cols-[2rem_minmax(0,1fr)_6rem_6rem_5rem_7rem]">
                  <span className="font-mono text-xs text-zinc-400">{i + 1}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <StreamerAvatar name={c.name} size="md" />
                    <div className="min-w-0">
                      <Link href={`/streamer/clippers/${c.id}`} className="flex items-center gap-1.5 truncate text-sm font-medium hover:underline">
                        {c.name} {c.tier && <TierBadge tier={c.tier} />}
                      </Link>
                      <Handles handles={c.handles} />
                    </div>
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums sm:font-normal">{compact(c.views)}</span>
                  <span className="col-start-2 text-xs text-zinc-500 sm:col-start-auto sm:text-right sm:text-sm sm:font-semibold sm:tabular-nums sm:text-zinc-900">
                    <span className="sm:hidden">{usdCompact(c.earned)} earned · {c.clips} clips</span>
                    <span className="hidden sm:inline">{usdCompact(c.earned)}</span>
                  </span>
                  <span className="hidden text-right text-sm tabular-nums sm:block">{c.clips}</span>
                  <span className="hidden text-right text-sm text-zinc-500 sm:block">{timeAgo(c.lastClipAt)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2 py-2.5">
      <p className="text-base font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

function Handles({ handles }: { handles: { platform: string; username: string | null }[] }) {
  const shown = handles.filter((h) => h.username);
  if (!shown.length) return <p className="text-xs text-zinc-500">Clipper</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-zinc-500">
      {shown.slice(0, 2).map((h) => (
        <span key={h.platform} className="inline-flex items-center gap-1">
          <PlatformIcon platform={h.platform as Platform} className="size-3" />@{h.username!.replace(/^@/, '')}
        </span>
      ))}
    </p>
  );
}
