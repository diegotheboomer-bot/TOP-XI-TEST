'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownWideNarrow, BadgeCheck, ChevronDown, Clapperboard, Eye, Shapes, Shield, X } from 'lucide-react';
import { cn } from './ui/cn';

type Custom = 'views' | 'clips' | 'percent';
export type FilterDef = {
  key: string;
  label: string;
  icon: 'sort' | 'topic' | 'tier' | 'approval' | 'views' | 'approved';
  options: [value: string, label: string][];
  /** Adds a "Custom…" choice where you type your own minimum. */
  custom?: Custom;
};

const ICONS = { sort: ArrowDownWideNarrow, topic: Shapes, tier: Shield, approval: BadgeCheck, views: Eye, approved: Clapperboard };
const CUSTOM = '__custom';

const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));
const customLabel = (kind: Custom, v: number) => (kind === 'views' ? `${compact(v)}+ views` : kind === 'clips' ? `${v}+ clips` : `${v}%+`);

/** "250k", "1.5m", "10,000" → a number. */
function parseAmount(raw: string): number {
  const m = raw.trim().toLowerCase().replace(/[,\s%+]/g, '').match(/^(\d+(?:\.\d+)?)([km]?)$/);
  if (!m) return NaN;
  return Math.round(Number(m[1]) * (m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1000 : 1));
}

/** Dropdown filters that live in the URL, so a filtered list can be shared or refreshed. */
export function ScoutFilters({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [editing, setEditing] = useState<FilterDef | null>(null);
  const [draft, setDraft] = useState('');
  const go = (q: URLSearchParams) => router.replace(`${path}${q.size ? `?${q}` : ''}`, { scroll: false });
  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    go(q);
  };
  const apply = () => {
    if (!editing?.custom) return;
    const n = parseAmount(draft);
    if (!Number.isFinite(n) || n <= 0) return;
    set(editing.key, String(editing.custom === 'percent' ? Math.min(100, n) : n));
    setEditing(null);
  };
  const active = filters.filter((f) => f.key !== 'sort' && params.get(f.key));

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {filters.map((f) => {
          const Icon = ICONS[f.icon];
          const value = params.get(f.key) ?? '';
          const on = !!value && f.key !== 'sort';
          const preset = f.options.find(([v]) => v === value);
          const shown = preset?.[1] ?? (f.custom && value ? customLabel(f.custom, Number(value)) : f.options[0][1]);
          return (
            <label
              key={f.key}
              className={cn(
                'relative flex h-12 items-center gap-2 rounded-xl border px-3 transition focus-within:ring-2 focus-within:ring-[rgb(var(--brand-a))]',
                on || editing?.key === f.key ? 'border-transparent bg-brand-a/10 ring-1 ring-[rgb(var(--brand-a))]' : 'border-zinc-200 bg-white hover:border-zinc-300',
              )}
            >
              <Icon className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">{f.label}</span>
                <span className="block truncate text-sm font-medium">{shown}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-zinc-400" />
              <select
                value={preset || !value ? value : CUSTOM}
                onChange={(e) => {
                  if (e.target.value === CUSTOM) {
                    setDraft(value && !preset ? value : '');
                    setEditing(f);
                  } else {
                    setEditing(null);
                    set(f.key, e.target.value);
                  }
                }}
                aria-label={f.label}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
                {f.custom && <option value={CUSTOM}>{value && !preset ? `Custom: ${shown}` : 'Custom…'}</option>}
              </select>
            </label>
          );
        })}
      </div>

      {editing?.custom && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-card"
        >
          <span className="w-full pl-1 text-sm font-medium sm:w-auto">Minimum {editing.label.toLowerCase()}</span>
          <div className="relative min-w-0 flex-1 sm:max-w-56">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputMode={editing.custom === 'views' ? 'text' : 'numeric'}
              placeholder={editing.custom === 'views' ? 'e.g. 250k or 1.5m' : editing.custom === 'percent' ? 'e.g. 85' : 'e.g. 12'}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-14 text-base focus:border-zinc-400 focus:outline-none sm:h-9 sm:text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{editing.custom === 'views' ? 'views' : editing.custom === 'percent' ? '%' : 'clips'}</span>
          </div>
          <button type="submit" disabled={!(parseAmount(draft) > 0)} className="h-10 rounded-lg bg-brand px-4 text-sm sm:h-9 font-semibold text-brand-ink transition hover:brightness-110 disabled:opacity-50">
            Apply
          </button>
          <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-lg sm:h-9 px-3 text-sm text-zinc-500 hover:text-zinc-900">
            Cancel
          </button>
        </form>
      )}

      {active.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const q = new URLSearchParams(params.toString());
            for (const f of active) q.delete(f.key);
            setEditing(null);
            go(q);
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          <X className="size-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}
