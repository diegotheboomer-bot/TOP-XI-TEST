'use client';

import { useState, useTransition } from 'react';
import type { ActionState } from '@/actions/result';
import { Button } from './ui/button';
import { cn } from './ui/cn';

/** Runs a bound server action and shows its result underneath. `block` makes it full width. */
export function ActionButton({
  action,
  children,
  variant = 'secondary',
  block,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  block?: boolean;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>();
  return (
    <span className={cn('flex-col items-start gap-1', block ? 'flex w-full' : 'inline-flex')}>
      <Button size={block ? 'md' : 'sm'} variant={variant} disabled={pending} className={block ? 'w-full' : undefined} onClick={() => start(async () => setState(await action()))}>
        {pending ? 'Working…' : children}
      </Button>
      {(state?.error || state?.success) && (
        <span className={`max-w-[16rem] text-xs ${state.error ? 'text-rose-600' : 'text-accent-700'}`}>{state.error ?? state.success}</span>
      )}
    </span>
  );
}
