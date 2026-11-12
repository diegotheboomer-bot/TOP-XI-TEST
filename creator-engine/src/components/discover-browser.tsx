'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownWideNarrow, ChevronDown, Compass, Search, Shapes, SlidersHorizontal, Sparkles, Video, Wallet, X } from 'lucide-react';
import type { MarketCampaign } from '@/lib/data';
import { CATEGORIES, CONTENT_TYPES, contentTypeLabel } from '@/lib/campaign-tags';
import { MarketCard } from './views';
import { cn } from './ui/cn';

type Filters = { q: string; niche: string; type: string; platform: string; pay: string; sort: string };
const EMPTY: Filters = { q: '', niche: '', type: '', platform: '', pay: '', sort: '' };

const PLATFORMS: [string, string][] = [
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube Shorts'],
  ['instagram', 'Instagram Reels'],
];
const PAY: [string, string][] = [
  ['pure_cpm', 'Per 1K views'],
  ['per_post', 'Per clip'],
  ['pool', 'Pool'],
];
const SORTS: [string, string][] = [
  ['', 'Newest'],
  ['pay', 'Highest pay'],
  ['budget', 'Most budget left'],
  ['ending', 'Ending soon'],
];

/** Best pay a clipper can get (per 1K views, or per clip ÷ 2 so clips and views rank together). */
const payScore = (c: MarketCampaign) => (c.payout_model === 'per_post' ? c.base_payout / 2 : c.payout_model === 'pool' ? 0 : Math.max(c.cpm_rate, ...Object.values(c.platform_rates ?? {}).map(Number)));

/** A small dropdown pill: shows the label, or the choice once one is picked. */
function Pick({ icon: Icon, label, value, options, onChange }: { icon: React.ElementType; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const chosen = options.find(([v]) => v === value)?.[1];
  return (
    <label
      className={cn(
        'relative inline-flex h-10 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-sm transition',
        value ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{chosen ?? label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 cursor-pointer opacity-0">
        <option value="">{label === 'Sort' ? 'Newest' : `Any ${label.toLowerCase()}`}</option>
        {options.filter(([v]) => v).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Discover: a quick search with simple filters, "For you" picks, then every campaign.
 * Card size follows how many there are: big when there are a few, four across when it's full.
 */
export function DiscoverBrowser({ campaigns, forYou }: { campaigns: MarketCampaign[]; forYou: string[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (k: keyof Filters) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [panel, setPanel] = useState(false);
  const filtering = Object.entries(f).some(([k, v]) => k !== 'sort' && v);

  const niches = CATEGORIES.filter((n) => campaigns.some((c) => c.category === n)).map((n) => [n, n] as [string, string]);
  const types = CONTENT_TYPES.filter(([id]) => campaigns.some((c) => c.content_types?.includes(id))).map(([id]) => [id, contentTypeLabel(id)] as [string, string]);

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const list = campaigns.filter(
      (c) =>
        (!q || `${c.title} ${c.brandName} ${c.agencyName ?? ''} ${c.category ?? ''}`.toLowerCase().includes(q)) &&
        (!f.niche || c.category === f.niche) &&
        (!f.type || c.content_types?.includes(f.type)) &&
        (!f.platform || c.platforms.includes(f.platform as never)) &&
        (!f.pay || c.payout_model === f.pay),
    );
    const by: Record<string, (a: MarketCampaign, b: MarketCampaign) => number> = {
      pay: (a, b) => payScore(b) - payScore(a),
      budget: (a, b) => b.budget.available - a.budget.available,
      ending: (a, b) => b.budget.usedShare - a.budget.usedShare,
    };
    return f.sort ? [...list].sort(by[f.sort]) : list;
  }, [campaigns, f]);

  const nameOf = (list: [string, string][], v: string) => list.find(([x]) => x === v)?.[1] ?? v;
  const chips = (
    [
      ['niche', f.niche && nameOf(niches, f.niche)],
      ['pay', f.pay && nameOf(PAY, f.pay)],
      ['platform', f.platform && nameOf(PLATFORMS, f.platform)],
      ['type', f.type && nameOf(types, f.type)],
      ['sort', f.sort && nameOf(SORTS, f.sort)],
    ] as [keyof Filters, string][]
  ).filter(([, l]) => l);
  const active = chips.length;
  const picks = forYou.map((id) => campaigns.find((c) => c.id === id)).filter((c): c is MarketCampaign => !!c);
  // Few campaigns: big cards. Lots: four across.
  const few = shown.length <= 3;
  // Wide cards with big pictures: one per row on phones, two on tablets, three on wide screens.
  const grid = shown.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="space-y-8">
      {/* Search: one bar, filters tucked behind a button, active ones as removable chips */}
      <div>
        <div className="group relative flex h-14 items-center gap-2 rounded-full border border-zinc-200 bg-white pl-5 pr-2 shadow-card transition focus-within:border-[rgb(var(--brand-a))] focus-within:shadow-[0_0_0_4px_rgb(var(--brand-a)/0.12)]">
          <Search className="size-5 shrink-0 text-zinc-400 transition group-focus-within:text-[rgb(var(--brand-ta))]" />
          <input
            value={f.q}
            onChange={(e) => set('q')(e.target.value)}
            placeholder="Search campaigns"
            aria-label="Search campaigns, streamers or brands"
            className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-zinc-400 focus:outline-none"
          />
          {f.q && (
            <button type="button" onClick={() => set('q')('')} aria-label="Clear search" className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel((o) => !o)}
            aria-expanded={panel}
            className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition', panel || active > 0 ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200')}
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {active > 0 && <span className="grid size-5 place-items-center rounded-full text-[11px] font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>{active}</span>}
          </button>
        </div>

        {panel && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-card sm:grid-cols-3 lg:grid-cols-5">
            {niches.length > 0 && <Pick icon={Shapes} label="Niche" value={f.niche} options={niches} onChange={set('niche')} />}
            <Pick icon={Wallet} label="Pay" value={f.pay} options={PAY} onChange={set('pay')} />
            <Pick icon={Compass} label="Platform" value={f.platform} options={PLATFORMS} onChange={set('platform')} />
            {types.length > 0 && <Pick icon={Video} label="Video type" value={f.type} options={types} onChange={set('type')} />}
            <Pick icon={ArrowDownWideNarrow} label="Sort" value={f.sort} options={SORTS} onChange={set('sort')} />
          </div>
        )}

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {chips.map(([k, label]) => (
              <button key={k} type="button" onClick={() => set(k)('')} className="inline-flex items-center gap-1 rounded-full bg-brand-a/15 px-3 py-1 text-xs font-medium text-[rgb(var(--brand-ta))] transition hover:bg-brand-a/25">
                {label} <X className="size-3" />
              </button>
            ))}
            <button type="button" onClick={() => setF(EMPTY)} className="px-2 text-xs font-medium text-zinc-500 hover:text-zinc-900">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* For you */}
      {!filtering && picks.length > 0 && campaigns.length > 4 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
            <Sparkles className="size-4 text-[rgb(var(--brand-ta))]" /> For you
          </h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {picks.map((c) => (
              <div key={c.id} className="w-[85%] shrink-0 snap-start sm:w-96">
                <MarketCard c={c} href={`/clipper/campaigns/${c.id}`} link={Link} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Everything */}
      <section>
        <h2 className="mb-3 flex items-baseline justify-between font-semibold tracking-tight">
          {filtering ? 'Results' : 'All campaigns'}
          <span className="text-sm font-normal text-zinc-500">{shown.length}</span>
        </h2>
        {shown.length ? (
          <div className={cn('grid gap-4', grid)}>
            {shown.map((c) => (
              <MarketCard key={c.id} c={c} href={`/clipper/campaigns/${c.id}`} link={Link} size="lg" />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-zinc-200 px-6 py-14 text-center">
            <Search className="size-6 text-zinc-400" />
            <p className="mt-3 font-medium">Nothing matches</p>
            <p className="mt-1 text-sm text-zinc-500">Try another search or clear the filters.</p>
            <button type="button" onClick={() => setF(EMPTY)} className="mt-4 text-sm font-medium underline">
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
