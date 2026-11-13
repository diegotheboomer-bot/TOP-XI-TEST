'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionState } from '@/actions/result';
import { FormMessage } from './form-message';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Input } from './ui/field';

/**
 * A button that asks first. With `typeToConfirm`, the person has to type that word.
 * After success it refreshes the page, or goes to `redirectTo`.
 */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  action,
  variant = 'ghost',
  typeToConfirm,
  redirectTo,
}: {
  label: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<ActionState>;
  variant?: 'ghost' | 'secondary' | 'danger';
  typeToConfirm?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<ActionState>();
  const ready = !typeToConfirm || typed.trim().toUpperCase() === typeToConfirm.toUpperCase();

  async function confirm() {
    setBusy(true);
    const r = await action();
    setBusy(false);
    if (r?.success) {
      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }
      setOpen(false);
      router.refresh();
      return;
    }
    setResult(r);
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        onClick={() => {
          setResult(undefined);
          setTyped('');
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} className="sm:max-w-md">
        <div className="space-y-4">
          {typeToConfirm && (
            <label className="block text-sm">
              <span className="text-zinc-500">
                Type <b className="text-zinc-900">{typeToConfirm}</b> to confirm
              </span>
              <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
          <FormMessage state={result} />
          <div className="flex gap-2">
            <Button variant="secondary" className="h-11 flex-1" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button variant="danger" className="h-11 flex-1" disabled={busy || !ready} onClick={confirm}>
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
