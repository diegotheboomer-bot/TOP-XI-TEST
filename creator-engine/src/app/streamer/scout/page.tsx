import Link from 'next/link';
import { Telescope } from 'lucide-react';
import { getInvitableCampaigns, getScoutClippers } from '@/lib/data';
import { compact } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { PlatformIcon } from '@/components/platform-icon';
import { StreamerAvatar, VerifiedMark } from '@/components/views';
import { TierBadge } from '@/components/tier-badge';
import { InviteButton } from '@/components/invite-button';
import { cn } from '@/components/ui/cn';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TOPICS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Movies & TV', 'Brands & products', 'Podcasts'];

export default async function ScoutPage({ searchParams }: { searchParams: { topic?: string } }) {
  const topic = TOPICS.includes(searchParams.topic ?? '') ? searchParams.topic : undefined;
  const [clippers, campaigns] = await Promise.all([getScoutClippers(topic), getInvitableCampaigns()]);
  return (
    <>
      <PageHeader title="Scout clippers" description="Find clippers with a proven record and invite them to your campaigns." />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[undefined, ...TOPICS].map((t) => (
          <Link
            key={t ?? 'all'}
            href={t ? `/streamer/scout?topic=${encodeURIComponent(t)}` : '/streamer/scout'}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
              topic === t ? 'border-transparent bg-brand text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
            )}
          >
            {t ?? 'Everyone'}
          </Link>
        ))}
      </div>
      {clippers.length === 0 ? (
        <Empty icon={<Telescope />} title="No clippers here yet" body="As clippers sign up and post, they show up here with their record." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clippers.map((c) => (
            <li key={c.id} className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="relative">
                  <StreamerAvatar name={c.name} size="md" src={c.avatar} />
                  <TierBadge tier={c.tier} iconOnly className="absolute -bottom-0.5 -right-0.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/streamer/clippers/${c.id}`} className="flex items-center gap-1.5 font-semibold tracking-tight hover:underline">
                    <span className="truncate">{c.name}</span>
                    {c.verified && <VerifiedMark />}
                  </Link>
                  <p className="flex flex-wrap gap-x-2 text-xs text-zinc-500">
                    {c.handles.slice(0, 2).map((h) => (
                      <span key={h.platform} className="inline-flex items-center gap-1">
                        <PlatformIcon platform={h.platform as Platform} className="size-3" />
                        {h.handle}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              {c.bio && <p className="mt-3 line-clamp-2 text-sm text-zinc-600">{c.bio}</p>}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Views', compact(c.views)],
                  ['Approved', String(c.approved)],
                  ['Approval', `${Math.round(c.approval * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-zinc-50 px-2 py-2">
                    <dd className="text-sm font-semibold tabular-nums">{v}</dd>
                    <dt className="text-[11px] text-zinc-500">{k}</dt>
                  </div>
                ))}
              </dl>
              {c.interests.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {c.interests.slice(0, 4).map((i) => (
                    <span key={i} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                      {i}
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                <TierBadge tier={c.tier} />
                <InviteButton creatorId={c.id} name={c.name} campaigns={campaigns} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
