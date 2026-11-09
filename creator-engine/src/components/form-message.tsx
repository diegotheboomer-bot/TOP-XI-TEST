import type { ActionState } from '@/actions/result';
import { cn } from './ui/cn';

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p role="status" className={cn('rounded-lg px-3.5 py-2.5 text-sm', state.error ? 'bg-rose-50 text-rose-700' : 'bg-accent-50 text-accent-700', className)}>
      {state.error ?? state.success}
    </p>
  );
}
