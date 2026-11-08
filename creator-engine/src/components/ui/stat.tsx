import { Card } from './card';

export function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-5 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-zinc-500">{label}</span>
        {icon && <span className="hidden size-8 shrink-0 sm:grid place-items-center rounded-xl bg-zinc-100 text-zinc-600 [&>svg]:size-4">{icon}</span>}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-zinc-500">{hint}</div>}
      </div>
    </Card>
  );
}
