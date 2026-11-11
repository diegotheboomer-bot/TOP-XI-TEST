'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownWideNarrow, ChevronDown, Compass, Search, Shapes, Sparkles, Video, Wallet, X } from 'lucide-react';
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
        'relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition',
        value ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
      )}
    >
      <Icon className="size-3.5" />
      {chosen ?? label}
      <ChevronDown className="size-3.5 opacity-60" />
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

  const picks = forYou.map((id) => campaigns.find((c) => c.id === id)).filter((c): c is MarketCampaign => !!c);
  // Few campaigns: big cards. Lots: four across.
  const few = shown.length <= 3;
  const grid = shown.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : few ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : shown.length <= 6 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="space-y-8">
      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
          <input
            value={f.q}
            onChange={(e) => set('q')(e.target.value)}
            placeholder="Search campaigns, streamers, brands…"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-11 text-base shadow-card transition focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/5"
          />
          {f.q && (
            <button type="button" onClick={() => set('q')('')} aria-label="Clear search" className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {niches.length > 0 && <Pick icon={Shapes} label="Niche" value={f.niche} options={niches} onChange={set('niche')} />}
          <Pick icon={Wallet} label="Pay" value={f.pay} options={PAY} onChange={set('pay')} />
          <Pick icon={Compass} label="Platform" value={f.platform} options={PLATFORMS} onChange={set('platform')} />
          {types.length > 0 && <Pick icon={Video} label="Video type" value={f.type} options={types} onChange={set('type')} />}
          <Pick icon={ArrowDownWideNarrow} label="Sort" value={f.sort} options={SORTS} onChange={set('sort')} />
          {filtering && (
            <button type="button" onClick={() => setF(EMPTY)} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
              <X className="size-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* For you */}
      {!filtering && picks.length > 0 && campaigns.length > 4 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
            <Sparkles className="size-4 text-[rgb(var(--brand-ta))]" /> For you
          </h2>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {picks.map((c) => (
              <div key={c.id} className="w-[72%] shrink-0 snap-start sm:w-72">
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
              <MarketCard key={c.id} c={c} href={`/clipper/campaigns/${c.id}`} link={Link} size={few ? 'lg' : 'md'} />
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
