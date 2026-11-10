'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { confirmHandoff, signInHere } from '@/actions/account';
import { Button } from '../ui/button';

type Params = { tokenHash: string; type: string; handoff: string };

/** The emailed link's page. The token is only used when Continue is pressed, so link scanners can't use it up. */
export function ConfirmCard(params: Params) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'handed_off' | 'invalid'>('idle');

  if (!params.tokenHash) return <Bad />;
  if (state === 'invalid') return <Bad />;

  if (state === 'handed_off') {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-10 text-[rgb(var(--brand-ta))]" />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">Email confirmed</h1>
        <p className="mt-1 text-sm text-zinc-500">You can close this tab. The page where you asked for the link is signing you in.</p>
        <button
          type="button"
          onClick={async () => {
            const { ok } = await signInHere(params);
            if (ok) router.push('/onboarding');
            else setState('invalid');
          }}
          className="mt-5 text-xs text-zinc-500 underline hover:text-zinc-900"
        >
          Closed that page? Continue here instead
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">Confirm it’s you</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">Press continue to confirm your email.</p>
      <Button
        className="h-11 w-full"
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy');
          const { status } = await confirmHandoff(params);
          if (status === 'signed_in') router.push('/onboarding');
          else setState(status);
        }}
      >
        {state === 'busy' ? 'Confirming…' : 'Continue'}
      </Button>
    </div>
  );
}

function Bad() {
  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">Link didn’t work</h1>
      <p className="mt-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
        It may have expired or already been used. <a href="/login" className="font-medium underline">Request a new one</a>.
      </p>
    </div>
  );
}
