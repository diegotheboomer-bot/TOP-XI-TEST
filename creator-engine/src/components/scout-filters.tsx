'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownWideNarrow, BadgeCheck, ChevronDown, Clapperboard, Eye, Shapes, Shield, SlidersHorizontal, X } from 'lucide-react';
import { Dialog } from './ui/dialog';
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
      <MobileFilters filters={filters} params={params} go={go} />
      <div className="hidden sm:block">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
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
    </div>
  );
}

const display = (f: FilterDef, value: string) => f.options.find(([v]) => v === value)?.[1] ?? (f.custom && value ? customLabel(f.custom, Number(value)) : f.options[0][1]);

/** Phones: one "Filters" button and a bottom sheet with chips. Nothing changes until Apply. */
function MobileFilters({ filters, params, go }: { filters: FilterDef[]; params: URLSearchParams; go: (q: URLSearchParams) => void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const active = filters.filter((f) => f.key !== 'sort' && params.get(f.key));
  const sort = filters.find((f) => f.key === 'sort');

  const start = () => {
    setPicked(Object.fromEntries(filters.map((f) => [f.key, params.get(f.key) ?? ''])));
    setCustom(
      Object.fromEntries(
        filters.filter((f) => f.custom).map((f) => {
          const v = params.get(f.key) ?? '';
          return [f.key, v && !f.options.some(([o]) => o === v) ? v : ''];
        }),
      ),
    );
    setOpen(true);
  };
  const apply = () => {
    const q = new URLSearchParams(params.toString());
    for (const f of filters) {
      let v = picked[f.key] ?? '';
      if (v === CUSTOM) {
        const n = parseAmount(custom[f.key] ?? '');
        v = n > 0 ? String(f.custom === 'percent' ? Math.min(100, n) : n) : '';
      }
      if (v) q.set(f.key, v);
      else q.delete(f.key);
    }
    go(q);
    setOpen(false);
  };
  const count = Object.entries(picked).filter(([k, v]) => k !== 'sort' && v).length;

  return (
    <div className="sm:hidden">
      <div className="flex gap-2">
        <button type="button" onClick={start} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold transition active:scale-[0.98]">
          <SlidersHorizontal className="size-4 text-[rgb(var(--brand-ta))]" /> Filters
          {active.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">{active.length}</span>}
        </button>
        {sort && (
          <label className="relative inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium">
            <ArrowDownWideNarrow className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" />
            <span className="truncate">{display(sort, params.get('sort') ?? '')}</span>
            <ChevronDown className="size-4 shrink-0 text-zinc-400" />
            <select
              value={params.get('sort') ?? ''}
              onChange={(e) => {
                const q = new URLSearchParams(params.toString());
                if (e.target.value) q.set('sort', e.target.value);
                else q.delete('sort');
                go(q);
              }}
              aria-label="Sort by"
              className="absolute inset-0 opacity-0"
            >
              {sort.options.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {active.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                const q = new URLSearchParams(params.toString());
                q.delete(f.key);
                go(q);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-a/15 px-2.5 py-1 text-xs font-medium text-[rgb(var(--brand-ta))]"
            >
              {display(f, params.get(f.key) ?? '')}
              {f.custom === 'percent' ? ' approval' : ''} <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Filters">
        <div className="space-y-5">
          {filters
            .filter((f) => f.key !== 'sort')
            .map((f) => {
              const Icon = ICONS[f.icon];
              const cur = picked[f.key] ?? '';
              return (
                <section key={f.key}>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Icon className="size-4 text-[rgb(var(--brand-ta))]" /> {f.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...f.options, ...(f.custom ? ([[CUSTOM, 'Custom']] as [string, string][]) : [])].map(([v, l]) => (
                      <button
                        key={v || 'any'}
                        type="button"
                        onClick={() => setPicked((p) => ({ ...p, [f.key]: v }))}
                        className={cn('rounded-full border px-3 py-1.5 text-sm transition', cur === v ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600')}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {cur === CUSTOM && f.custom && (
                    <div className="relative mt-2">
                      <input
                        autoFocus
                        value={custom[f.key] ?? ''}
                        onChange={(e) => setCustom((c) => ({ ...c, [f.key]: e.target.value }))}
                        inputMode={f.custom === 'views' ? 'text' : 'numeric'}
                        placeholder={f.custom === 'views' ? 'Minimum, e.g. 250k or 1.5m' : f.custom === 'percent' ? 'Minimum, e.g. 85' : 'Minimum, e.g. 12'}
                        className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 pr-16 text-base focus:border-zinc-400 focus:outline-none"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">{f.custom === 'views' ? 'views' : f.custom === 'percent' ? '%' : 'clips'}</span>
                    </div>
                  )}
                </section>
              );
            })}
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex gap-2 border-t border-zinc-200/80 bg-white px-5 py-4">
          <button type="button" onClick={() => setPicked((p) => ({ sort: p.sort ?? '' }))} className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-medium">
            Reset
          </button>
          <button type="button" onClick={apply} className="h-11 flex-1 rounded-xl bg-brand text-sm font-semibold text-brand-ink">
            Apply{count ? ` · ${count}` : ''}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
