import { Info } from 'lucide-react';
import { cn } from '../ui/cn';

export type Step = { icon: React.ElementType; title: string; short: string; more: string };

/** Short steps with an info toggle that opens the full explanation, so the page isn't a wall of text. */
export function InviteSteps({ steps, highlight }: { steps: Step[]; highlight?: number }) {
  return (
    <div>
      <ol className={cn('grid gap-2 sm:gap-3', steps.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className={cn('rounded-2xl p-3 ring-1 ring-inset sm:p-4', i === highlight ? 'bg-brand-a/10 ring-brand-a/30' : 'bg-zinc-100/50 ring-zinc-200/60')}>
              <span className={cn('grid size-9 place-items-center rounded-xl', i === highlight ? 'bg-brand text-brand-ink' : 'bg-zinc-200/70 text-zinc-600')}>
                <Icon className="size-[18px]" />
              </span>
              <span className="mt-2.5 block text-sm font-semibold leading-tight tracking-tight">{s.title}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{s.short}</span>
            </li>
          );
        })}
      </ol>
      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 [&::-webkit-details-marker]:hidden">
          <Info className="size-3.5" /> <span className="group-open:hidden">More details</span>
          <span className="hidden group-open:inline">Hide details</span>
        </summary>
        <ul className="mt-2 space-y-2 rounded-2xl bg-zinc-100/50 p-4 text-sm leading-relaxed text-zinc-500">
          {steps.map((s) => (
            <li key={s.title}>
              <b className="font-medium text-zinc-900">{s.title}.</b> {s.more}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
