'use client';

import { useState, useTransition } from 'react';
import type { ActionState } from '@/actions/result';
import { Button } from './ui/button';

/** Runs a bound server action and shows its result underneath. */
export function ActionButton({
  action,
  children,
  variant = 'secondary',
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size="sm" variant={variant} disabled={pending} onClick={() => start(async () => setState(await action()))}>
        {pending ? 'Working…' : children}
      </Button>
      {(state?.error || state?.success) && (
        <span className={`max-w-[16rem] text-xs ${state.error ? 'text-rose-600' : 'text-accent-700'}`}>{state.error ?? state.success}</span>
      )}
    </span>
  );
}
