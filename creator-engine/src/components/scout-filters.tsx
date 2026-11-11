'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownWideNarrow, BadgeCheck, ChevronDown, Clapperboard, Eye, Shapes, Shield, X } from 'lucide-react';
import { cn } from './ui/cn';

export type FilterDef = { key: string; label: string; icon: 'sort' | 'topic' | 'tier' | 'approval' | 'views' | 'approved'; options: [value: string, label: string][] };

const ICONS = { sort: ArrowDownWideNarrow, topic: Shapes, tier: Shield, approval: BadgeCheck, views: Eye, approved: Clapperboard };

/** Dropdown filters that live in the URL, so a filtered list can be shared or refreshed. */
export function ScoutFilters({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    router.replace(`${path}${q.size ? `?${q}` : ''}`, { scroll: false });
  };
  const active = filters.filter((f) => f.key !== 'sort' && params.get(f.key));
  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {filters.map((f) => {
          const Icon = ICONS[f.icon];
          const value = params.get(f.key) ?? '';
          const on = !!value && f.key !== 'sort';
          return (
            <label
              key={f.key}
              className={cn(
                'relative flex h-12 items-center gap-2 rounded-xl border px-3 transition focus-within:ring-2 focus-within:ring-[rgb(var(--brand-a))]',
                on ? 'border-transparent bg-brand-a/10 ring-1 ring-[rgb(var(--brand-a))]' : 'border-zinc-200 bg-white hover:border-zinc-300',
              )}
            >
              <Icon className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">{f.label}</span>
                <span className="block truncate text-sm font-medium">{f.options.find(([v]) => v === value)?.[1] ?? f.options[0][1]}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-zinc-400" />
              <select value={value} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} className="absolute inset-0 cursor-pointer opacity-0">
                {f.options.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      {active.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const q = new URLSearchParams(params.toString());
            for (const f of active) q.delete(f.key);
            router.replace(`${path}${q.size ? `?${q}` : ''}`, { scroll: false });
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          <X className="size-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}
