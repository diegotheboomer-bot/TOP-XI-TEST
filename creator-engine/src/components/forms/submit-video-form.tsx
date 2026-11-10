'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, TriangleAlert, X } from 'lucide-react';
import { submitVideo } from '@/actions/creator';
import type { SubmitState } from '@/actions/result';
import { FormMessage } from '../form-message';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/field';
import { cn } from '../ui/cn';

const STEP_MS = 450;
// Shown while the server works, before the real results arrive.
const PLACEHOLDER = ['Link recognised', 'Video found', 'It’s your video', 'Posted after you joined', 'Original clip'];

/**
 * Submit a clip link. Opens a checklist that ticks through each check the
 * server ran (link, video found, ownership, posted after joining, duplicates, #ad).
 */
export function SubmitVideoForm({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SubmitState>();
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  // Reveal the server's checks one at a time.
  const checks = result?.checks ?? [];
  useEffect(() => {
    if (!result || shown >= checks.length) return;
    const id = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [result, shown, checks.length]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(undefined);
    if (data.get('noPaidPromo') !== 'on') return setError('Confirm the clip isn’t paid-promoted.');
    setResult(undefined);
    setShown(0);
    setOpen(true);
    const res = await submitVideo(undefined, data).catch(() => ({ error: 'Something went wrong. Try again.' }) as SubmitState);
    setResult(res);
    if (!res?.checks?.length) setShown(0);
  }

  const done = !!result && shown >= checks.length;
  const ok = !!result?.success;
  const rows = result ? checks.slice(0, shown) : [];
  const pending = result ? (done ? [] : [checks[shown]?.label ?? '']) : PLACEHOLDER;

  return (
    <>
      <form ref={formRef} onSubmit={submit} className="space-y-3">
        <input type="hidden" name="campaignId" value={campaignId} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input name="videoUrl" type="url" required placeholder="Link to your clip on TikTok, Shorts or Reels" aria-label="Clip link" className="sm:flex-1" />
          <Button type="submit">Submit clip</Button>
        </div>
        <label className="flex items-start gap-2 text-xs text-zinc-500">
          <input type="checkbox" name="noPaidPromo" required className="mt-0.5 size-3.5 accent-[rgb(var(--brand-b))]" />
          <span>I haven’t paid and won’t pay to promote or boost this clip (TikTok Promote, ads or similar).</span>
        </label>
        <FormMessage state={error ? { error } : undefined} />
      </form>

      <Dialog
        open={open}
        onClose={() => {
          if (!done) return; // stay open until every check has shown
          setOpen(false);
          if (ok) formRef.current?.reset();
        }}
        title={!done ? 'Checking your clip' : ok ? 'Clip submitted' : 'Clip not submitted'}
      >
        <ol className="space-y-1">
          {rows.map((c, i) => (
            <li key={i} className="step-in flex items-start gap-3 rounded-lg px-1 py-2">
              <StatusIcon status={c.status} />
              <span className="min-w-0">
                <span className={cn('block text-sm font-medium', c.status === 'fail' && 'text-rose-700')}>{c.label}</span>
                {c.detail && <span className={cn('block text-xs', c.status === 'pass' ? 'text-zinc-500' : c.status === 'warn' ? 'text-amber-700' : 'text-rose-700')}>{c.detail}</span>}
              </span>
            </li>
          ))}
          {pending.map((label, i) => (
            <li key={`p${i}`} className="flex items-start gap-3 rounded-lg px-1 py-2">
              <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center')}>
                {i === 0 ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-r-transparent" />
                ) : (
                  <span className="size-4 rounded-full border-2 border-zinc-200" />
                )}
              </span>
              <span className={cn('text-sm', i === 0 ? 'font-medium' : 'text-zinc-400')}>{label}</span>
            </li>
          ))}
        </ol>

        {done && (
          <div className="step-in mt-4">
            {!checks.length && <FormMessage state={result} />}
            {checks.length > 0 && (
              <p className={cn('rounded-xl px-3.5 py-2.5 text-sm', ok ? 'bg-brand-a/10 text-zinc-900' : 'bg-rose-50 text-rose-700')}>
                {ok ? (result?.success ?? 'Submitted.') : 'Fix the step marked ✕ and submit again.'}
              </p>
            )}
            <Button
              className="mt-4 h-11 w-full"
              onClick={() => {
                setOpen(false);
                if (ok) formRef.current?.reset();
              }}
            >
              {ok ? 'Done' : 'Got it'}
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}

function StatusIcon({ status }: { status: 'pass' | 'fail' | 'warn' }) {
  return (
    <span
      className={cn(
        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
        status === 'pass' && 'bg-brand text-brand-ink',
        status === 'warn' && 'bg-amber-50 text-amber-700',
        status === 'fail' && 'bg-rose-50 text-rose-700',
      )}
    >
      {status === 'pass' ? <Check className="size-3" strokeWidth={3.5} /> : status === 'warn' ? <TriangleAlert className="size-3" /> : <X className="size-3" strokeWidth={3} />}
    </span>
  );
}
