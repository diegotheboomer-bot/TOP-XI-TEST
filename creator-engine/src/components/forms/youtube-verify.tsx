'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Check } from 'lucide-react';
import { verifyYouTubeChannel } from '@/actions/creator';
import { CopyField } from '../copy-button';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/field';

/** Verify a YouTube channel once with a code in its description. */
export function YouTubeVerify({ code, verified }: { code: string; verified: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(verifyYouTubeChannel, undefined);
  return (
    <>
      <Button size="sm" variant={verified ? 'ghost' : 'secondary'} onClick={() => setOpen(true)}>
        {verified ? 'Reconnect' : 'Connect'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Connect your YouTube channel" description="One time. Then any Short from that channel counts as yours." className="sm:max-w-md">
        {state?.success ? (
          <div className="step-in text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand text-brand-ink">
              <Check className="size-6" strokeWidth={3} />
            </span>
            <p className="mt-3 text-sm text-zinc-600">{state.success}</p>
            <Button className="mt-5 h-11 w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <ol className="space-y-5">
            <Step n={1} title="Copy your code">
              <CopyField label="Verify code" value={code} />
            </Step>
            <Step n={2} title="Add it to your channel description">
              <p className="text-sm text-zinc-500">
                In YouTube Studio: <span className="text-zinc-900">Customisation → Basic info → Description</span>. Paste it anywhere and publish. You can remove it once you’re verified.
              </p>
              <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium underline">
                Open YouTube Studio
              </a>
            </Step>
            <Step n={3} title="Paste your channel link">
              <form action={action} className="space-y-3">
                <Input name="channel" required placeholder="youtube.com/@yourname" autoComplete="url" />
                <FormMessage state={state} />
                <SubmitButton className="h-11 w-full" pendingText="Checking…">
                  Check my channel
                </SubmitButton>
              </form>
            </Step>
          </ol>
        )}
      </Dialog>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 font-mono text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
