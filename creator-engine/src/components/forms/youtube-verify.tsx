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
import { cn } from '../ui/cn';
import { PopupConnect } from '../popup-connect';

/**
 * Connect a YouTube channel: with Google when it's set up (`google`), otherwise once with
 * a code in the channel description.
 */
export function YouTubeVerify({ code, verified, google = false }: { code: string; verified: boolean; google?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(verifyYouTubeChannel, undefined);
  if (google) {
    return (
      <PopupConnect
        href="/api/oauth/youtube/start"
        className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition', verified ? 'text-zinc-600 hover:bg-zinc-100' : 'border border-zinc-200 hover:bg-zinc-50')}
      >
        <GoogleG /> {verified ? 'Reconnect' : 'Connect'}
      </PopupConnect>
    );
  }
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

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
  </svg>
);
