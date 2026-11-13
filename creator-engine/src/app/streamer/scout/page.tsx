import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, Clapperboard, Lock, Telescope } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { getInvitableCampaigns, getScoutClippers, type InvitableCampaign, type ScoutClipper } from '@/lib/data';
import { TIERS, TIER_LABEL, atLeast, tierRank, type Tier } from '@/lib/tiers';
import { ScoutFilters, type FilterDef } from '@/components/scout-filters';
import { compact } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { PlatformIcon } from '@/components/platform-icon';
import { StreamerAvatar } from '@/components/views';
import { TierBadge } from '@/components/tier-badge';
import { InviteButton } from '@/components/invite-button';
import { InviteAllButton } from '@/components/invite-all-button';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TOPICS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Movies & TV', 'Brands & products', 'Podcasts'];

type Search = { topic?: string; tier?: string; approval?: string; views?: string; approved?: string; sort?: string; campaign?: string };

const FILTERS: FilterDef[] = [
  { key: 'sort', label: 'Sort by', icon: 'sort', options: [['', 'Best match'], ['views', 'All-time views'], ['approved', 'Clips approved'], ['approval', 'Approval rate'], ['tier', 'Tier']] },
  { key: 'topic', label: 'Niche', icon: 'topic', options: [['', 'Any niche'], ...TOPICS.map((t) => [t, t] as [string, string])] },
  { key: 'tier', label: 'Tier', icon: 'tier', options: [['', 'Any tier'], ...TIERS.slice(1).map((t) => [t, `${TIER_LABEL[t]}+`] as [string, string])] },
  { key: 'approval', label: 'Approval', icon: 'approval', custom: 'percent', options: [['', 'Any rate'], ['80', '80%+'], ['90', '90%+'], ['95', '95%+']] },
  { key: 'views', label: 'Views', icon: 'views', custom: 'views', options: [['', 'Any views'], ['10000', '10K+ views'], ['100000', '100K+ views'], ['1000000', '1M+ views'], ['10000000', '10M+ views']] },
  { key: 'approved', label: 'Approved', icon: 'approved', custom: 'clips', options: [['', 'Any clips'], ['5', '5+ clips'], ['20', '20+ clips'], ['50', '50+ clips'], ['120', '120+ clips']] },
];

/** How well a clipper fits a niche: clipped it and likes it > clipped it > only said they like it. */
const fit = (c: ScoutClipper, topic: string) => (c.clipped.includes(topic) ? 2 : 0) + (c.interests.includes(topic) ? 1 : 0);

export default async function ScoutPage({ searchParams: sp }: { searchParams: Search }) {
  // Held back for now; it comes back as a paid feature.
  if (process.env.SCOUT_ENABLED?.trim() !== 'true') redirect('/streamer');
  const topic = TOPICS.includes(sp.topic ?? '') ? sp.topic : undefined;
  const minTier = (TIERS as readonly string[]).includes(sp.tier ?? '') ? (sp.tier as Tier) : undefined;
  const [all, campaigns] = await Promise.all([getScoutClippers(topic), getInvitableCampaigns()]);
  const focus = campaigns.find((c) => c.id === sp.campaign);
  const clippers = all
    .filter(
      (c) =>
        (!minTier || atLeast(c.tier, minTier)) &&
        c.approval * 100 >= (Number(sp.approval) || 0) &&
        c.views >= (Number(sp.views) || 0) &&
        c.approved >= (Number(sp.approved) || 0),
    )
    .sort((a, b) =>
      sp.sort === 'views'
        ? b.views - a.views
        : sp.sort === 'approved'
          ? b.approved - a.approved
          : sp.sort === 'approval'
            ? b.approval - a.approval || b.approved - a.approved
            : sp.sort === 'tier'
              ? tierRank(b.tier) - tierRank(a.tier) || b.views - a.views
              : topic
                ? fit(b, topic) - fit(a, topic)
                : 0,
    );
  return (
    <>
      <PageHeader title="Scout clippers" description="Find clippers with a proven record and invite them to your campaigns." />
      {focus && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">
          <Lock className="size-4 text-[rgb(var(--brand-ta))]" />
          Inviting to <b>{focus.title}</b> · {focus.invited.length} invited so far
          <Link href={`/streamer/campaigns/${focus.id}`} className="ml-auto font-medium underline">
            Back to campaign
          </Link>
        </div>
      )}
      <ScoutFilters filters={FILTERS} />
      {clippers.length > 0 && (
        <div className="-mt-2 mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            {clippers.length} {clippers.length === 1 ? 'clipper' : 'clippers'}
          </p>
          <InviteAllButton creatorIds={clippers.map((c) => c.id)} campaigns={campaigns.map((c) => ({ id: c.id, title: c.title, draft: c.draft }))} preselect={focus?.id} />
        </div>
      )}
      {clippers.length === 0 ? (
        all.length === 0 ? (
          <Empty icon={<Telescope />} title="No clippers here yet" body="As clippers sign up and post, they show up here with their record." />
        ) : (
          <Empty icon={<Telescope />} title="No one matches those filters" body="Try a lower minimum or another niche." />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clippers.map((c) => (
            <li key={c.id} className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="relative">
                  <StreamerAvatar name={c.name} size="md" src={c.avatar} />
                  <TierBadge tier={c.tier} founder={c.founder} iconOnly className="absolute -bottom-0.5 -right-0.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/streamer/clippers/${c.id}`} className="flex items-center gap-1.5 font-semibold tracking-tight hover:underline">
                    <span className="truncate">{c.name}</span>
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
              {(c.interests.length > 0 || c.clipped.length > 0) && (
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {/* Niches they've clipped first (proven), then ones they said they like. */}
                  {c.clipped.slice(0, 4).map((i) => (
                    <span key={`c-${i}`} title={`Has posted clips for ${i} campaigns`} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', i === topic ? 'bg-brand text-brand-ink' : 'bg-brand-a/15 text-[rgb(var(--brand-ta))]')}>
                      <Clapperboard className="size-3" /> Clips {i}
                    </span>
                  ))}
                  {c.interests
                    .filter((i) => !c.clipped.includes(i))
                    .slice(0, Math.max(0, 4 - c.clipped.length))
                    .map((i) => (
                      <span key={i} className={cn('rounded-full px-2 py-0.5 text-[11px]', i === topic ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600')}>
                        {i}
                      </span>
                    ))}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                <TierBadge tier={c.tier} />
                <Invite clipperId={c.id} name={c.name} campaigns={campaigns} preselect={focus?.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Invite, but only to campaigns the clipper isn't already in. */
function Invite({ clipperId, name, campaigns, preselect }: { clipperId: string; name: string; campaigns: InvitableCampaign[]; preselect?: string }) {
  const open = campaigns.filter((c) => !c.joined.includes(clipperId)).map((c) => ({ id: c.id, title: c.title, draft: c.draft, invited: c.invited.includes(clipperId) }));
  if (campaigns.length > 0 && open.length === 0) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-sm font-medium text-zinc-600">
        <Check className="size-3.5" /> In your campaigns
      </span>
    );
  }
  if (preselect && campaigns.find((c) => c.id === preselect)?.joined.includes(clipperId)) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-sm font-medium text-zinc-600">
        <Check className="size-3.5" /> Already in
      </span>
    );
  }
  if (preselect && open.find((c) => c.id === preselect)?.invited) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-a/15 px-3 text-sm font-medium text-[rgb(var(--brand-ta))]">
        <Check className="size-3.5" /> Invited
      </span>
    );
  }
  return <InviteButton creatorId={clipperId} name={name} campaigns={open} preselect={preselect} />;
}
