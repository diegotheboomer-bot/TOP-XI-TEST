'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardPaste, Link2, TriangleAlert, X } from 'lucide-react';
import { PlatformIcon } from '../platform-icon';
import type { Platform } from '@/lib/types';
import { submitVideo } from '@/actions/creator';
import type { SubmitCheck, SubmitState } from '@/actions/result';
import { FormMessage } from '../form-message';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/field';
import { cn } from '../ui/cn';

const STEP_MS = 420;

/** Which platform a pasted link is from, so the box can show its logo. */
function platformOf(url: string): Platform | null {
  const u = url.toLowerCase();
  if (/tiktok\.com/.test(u)) return 'tiktok';
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
  if (/instagram\.com/.test(u)) return 'instagram';
  return null;
}
// Shown while the server works, before the real results arrive.
const PLACEHOLDER = ['Link recognised', 'Video found', 'It’s your video', 'Posted after you joined', 'Original clip'];

/**
 * Submit a clip link. Opens a stepper that ticks through each check the
 * server ran (link, video found, ownership, posted after joining, duplicates).
 */
export function SubmitVideoForm({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SubmitState>();
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [canPaste, setCanPaste] = useState(false);
  useEffect(() => setCanPaste(!!navigator.clipboard?.readText), []);
  const platform = platformOf(url);
  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setUrl(text);
    } catch {
      inputRef.current?.focus(); // permission denied: let them paste by hand
    }
  };

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
    setResult(await submitVideo(undefined, data).catch(() => ({ error: 'Something went wrong. Try again.' }) as SubmitState));
  }

  const done = !!result && shown >= checks.length;
  const ok = !!result?.success;
  const close = () => {
    if (!done) return; // stay open until every check has shown
    setOpen(false);
    if (ok) {
      formRef.current?.reset();
      setUrl('');
    }
  };

  return (
    <>
      <form ref={formRef} onSubmit={submit} className="space-y-3">
        <input type="hidden" name="campaignId" value={campaignId} />
        {/* One big, obvious box: paste the link, see which platform it is, submit. */}
        <div className="flex h-14 items-center gap-2 rounded-2xl border-2 border-zinc-200 bg-white pl-4 pr-1.5 transition focus-within:border-[rgb(var(--brand-a))]">
          {platform ? <PlatformIcon platform={platform} className="size-5 shrink-0 text-[rgb(var(--brand-ta))]" /> : <Link2 className="size-5 shrink-0 text-zinc-400" />}
          <input
            ref={inputRef}
            name="videoUrl"
            type="url"
            inputMode="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your clip link"
            aria-label="Clip link"
            className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-zinc-400 focus:outline-none"
          />
          {!url && canPaste && (
            <button type="button" onClick={paste} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-100 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200">
              <ClipboardPaste className="size-4" /> Paste
            </button>
          )}
        </div>
        {url && !platform && <p className="text-xs text-amber-700">That doesn’t look like a TikTok, YouTube Shorts or Instagram Reels link.</p>}
        <label className="flex items-start gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
          <input type="checkbox" name="noPaidPromo" required className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--brand-b))]" />
          <span>I haven’t paid and won’t pay to promote or boost this clip (TikTok Promote, ads or similar).</span>
        </label>
        <FormMessage state={error ? { error } : undefined} />
        <Button type="submit" className="h-12 w-full text-base">
          Submit clip
        </Button>
      </form>

      <Dialog open={open} onClose={close} title={!done ? 'Checking your clip' : ok ? 'Clip submitted' : 'Couldn’t submit'} className="sm:max-w-md">
        <CheckList result={result} shown={shown} done={done} ok={ok} onDone={close} />
      </Dialog>
    </>
  );
}

/** The stepper inside the popup. Exported for previews. */
export function CheckList({ result, shown, done, ok, onDone }: { result: SubmitState; shown: number; done: boolean; ok: boolean; onDone: () => void }) {
  const checks = result?.checks ?? [];
  const steps: { label: string; state: SubmitCheck['status'] | 'active' | 'todo'; detail?: string }[] = result
    ? [
        ...checks.slice(0, shown).map((c) => ({ label: c.label, state: c.status, detail: c.detail })),
        ...(done ? [] : [{ label: checks[shown]?.label ?? '', state: 'active' as const }]),
      ]
    : PLACEHOLDER.map((label, i) => ({ label, state: i === 0 ? ('active' as const) : ('todo' as const) }));
  const total = result ? Math.max(checks.length, 1) : PLACEHOLDER.length;
  const progress = done ? 1 : result ? shown / total : 0.08;

  return (
    <div>
      {/* Progress */}
      <div className="-mt-2 mb-5 h-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', done && !ok ? 'bg-rose-600' : 'bg-brand')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <ol>
        {steps.map((s, i) => (
          <li key={`${i}-${s.label}`} className={cn('relative flex gap-3.5 pb-5 last:pb-0', s.state !== 'todo' && s.state !== 'active' && 'step-in')}>
            {i < steps.length - 1 && (
              <span className={cn('absolute left-[11px] top-7 bottom-1 w-0.5 rounded-full', s.state === 'pass' ? 'bg-brand-b/50' : 'bg-zinc-200')} aria-hidden />
            )}
            <Dot state={s.state} />
            <div className="min-w-0 pt-0.5">
              <p className={cn('text-sm font-medium leading-5', s.state === 'todo' && 'text-zinc-400', s.state === 'fail' && 'text-rose-700')}>{s.label}</p>
              {s.detail && (
                <p className={cn('mt-0.5 text-xs leading-relaxed', s.state === 'pass' ? 'text-zinc-500' : s.state === 'warn' ? 'text-amber-700' : 'text-rose-700')}>{s.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {done && (
        <div className="step-in mt-6">
          {!checks.length ? (
            <FormMessage state={result} />
          ) : (
            <p className={cn('rounded-xl px-4 py-3 text-sm leading-relaxed', ok ? 'bg-brand-a/10 text-zinc-700' : 'bg-rose-50 text-rose-700')}>
              {ok ? result?.success : 'Fix the step marked ✕, then submit again.'}
            </p>
          )}
          <Button className="mt-4 h-11 w-full" onClick={onDone}>
            {ok ? 'Done' : 'Got it'}
          </Button>
        </div>
      )}
    </div>
  );
}

function Dot({ state }: { state: SubmitCheck['status'] | 'active' | 'todo' }) {
  return (
    <span
      className={cn(
        'relative z-[1] grid size-6 shrink-0 place-items-center rounded-full transition',
        state === 'pass' && 'bg-brand text-brand-ink',
        state === 'warn' && 'bg-amber-50 text-amber-700 ring-1 ring-amber-300',
        state === 'fail' && 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
        state === 'active' && 'bg-white ring-1 ring-zinc-300',
        state === 'todo' && 'bg-white ring-1 ring-zinc-200',
      )}
    >
      {state === 'pass' && <Check className="size-3.5" strokeWidth={3.5} />}
      {state === 'warn' && <TriangleAlert className="size-3" />}
      {state === 'fail' && <X className="size-3.5" strokeWidth={3} />}
      {state === 'active' && <span className="size-3.5 animate-spin rounded-full border-2 border-brand-b border-r-transparent" />}
    </span>
  );
}
