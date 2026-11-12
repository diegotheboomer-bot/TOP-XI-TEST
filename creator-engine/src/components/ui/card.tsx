import { cn } from './cn';

/** `flush` drops the inner padding, for lists and tables that run edge to edge. */
export function Card({ className, flush, ...props }: React.HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return <div className={cn('rounded-xl border border-zinc-200/80 bg-white shadow-card', !flush && 'p-4 sm:p-6', className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
