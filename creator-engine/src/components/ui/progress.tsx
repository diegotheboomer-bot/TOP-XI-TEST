import { cn } from './cn';

export function Progress({ value, max, tone = 'brand', className }: { value: number; max: number; tone?: 'accent' | 'amber' | 'neutral' | 'brand'; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = tone === 'amber' ? 'bg-amber-700' : tone === 'neutral' ? 'bg-zinc-400' : tone === 'brand' ? 'bg-brand' : 'bg-accent-500';
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}
