import { cn } from './cn';

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
}

/** A row of figures in one panel, divided by hairlines (2 columns on phones, 4 on wide screens). */
export function StatGrid({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-200/80 shadow-card lg:grid-cols-4', className)}>
      {items.map((s) => (
        <div key={s.label} className="min-w-0 bg-white px-4 py-4 sm:px-5">
          <dt className="truncate text-[13px] text-zinc-500">{s.label}</dt>
          <dd className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{s.value}</dd>
          {s.hint && <dd className="mt-0.5 truncate text-xs text-zinc-500">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
