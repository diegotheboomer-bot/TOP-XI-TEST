'use client';

import { useFormState } from 'react-dom';
import { Check, TriangleAlert, X } from 'lucide-react';
import { testChannel, testShort, type TestResult } from '@/actions/test-youtube';
import { CopyField } from '../copy-button';
import { SubmitButton } from '../submit-button';
import { Card } from '../ui/card';
import { Input } from '../ui/field';
import { cn } from '../ui/cn';

export function YouTubeTest({ code }: { code: string }) {
  const [channel, checkChannel] = useFormState(testChannel, undefined);
  const [short, checkShort] = useFormState(testShort, undefined);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold">1. Verify a channel</h2>
        <p className="mt-1 text-sm text-zinc-500">Put this code in the channel description, save, then check.</p>
        <div className="mt-4">
          <CopyField label="Test code" value={code} />
        </div>
        <form action={checkChannel} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input name="channel" required placeholder="youtube.com/@yourname" className="sm:flex-1" />
          <SubmitButton pendingText="Checking…">Check channel</SubmitButton>
        </form>
        <Results result={channel} />
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">2. Check a Short</h2>
        <p className="mt-1 text-sm text-zinc-500">Reads its views and whether it’s on the channel you checked above.</p>
        <form action={checkShort} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="channelId" value={channel?.channelId ?? ''} />
          <Input name="video" type="url" required placeholder="youtube.com/shorts/…" className="sm:flex-1" />
          <SubmitButton pendingText="Checking…">Check Short</SubmitButton>
        </form>
        <Results result={short} />
      </Card>
    </div>
  );
}

function Results({ result }: { result: TestResult }) {
  if (!result) return null;
  return (
    <ul className="mt-4 space-y-2.5 border-t border-zinc-200/80 pt-4">
      {result.checks.map((c, i) => (
        <li key={i} className="step-in flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
              c.status === 'pass' && 'bg-brand text-brand-ink',
              c.status === 'warn' && 'bg-amber-50 text-amber-700',
              c.status === 'fail' && 'bg-rose-50 text-rose-700',
            )}
          >
            {c.status === 'pass' ? <Check className="size-3" strokeWidth={3.5} /> : c.status === 'warn' ? <TriangleAlert className="size-3" /> : <X className="size-3" strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{c.label}</span>
            {c.detail && <span className="block break-all font-mono text-xs text-zinc-500">{c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
