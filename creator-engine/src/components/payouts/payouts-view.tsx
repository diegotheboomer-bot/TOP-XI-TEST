'use client';

import { useState } from 'react';
import { AlertTriangle, BadgeCheck, Landmark, Mail, Smartphone } from 'lucide-react';
import type { ActionState } from '@/actions/result';
import { PAYOUT_METHODS, PAYOUT_METHOD_LABEL, payoutDestination, payoutReady, formatUsPhone, type PayoutMethod, type PayoutSetup } from '@/lib/payout-methods';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';
import { FormMessage } from '../form-message';

const OPTIONS: { method: PayoutMethod; icon: React.ReactNode; detail: string }[] = [
  { method: 'stripe', icon: <Landmark />, detail: 'Bank account or debit card, through Stripe.' },
  { method: 'paypal', icon: <Mail />, detail: 'Sent to the email on your PayPal account.' },
  { method: 'venmo', icon: <Smartphone />, detail: 'Sent to your Venmo mobile number. US only.' },
];

/**
 * /clipper/payouts, shared by the app and the standalone demo: pick bank or
 * debit card (Stripe), PayPal or Venmo; shows where money goes once set.
 */
export function PayoutsView({
  setup,
  stripeForm,
  manageStripe,
  onSave,
  methods = PAYOUT_METHODS,
}: {
  setup: PayoutSetup;
  /** Stripe's embedded onboarding (or the demo's mock form). */
  stripeForm: React.ReactNode;
  manageStripe?: React.ReactNode;
  onSave: (method: PayoutMethod, handle: string) => Promise<ActionState> | ActionState;
  /** Methods this platform offers (PayPal/Venmo only when PayPal is configured). */
  methods?: PayoutMethod[];
}) {
  const ready = payoutReady(setup);
  const [editing, setEditing] = useState(!ready);
  const [choice, setChoice] = useState<PayoutMethod>(setup.method);
  // Finishing Stripe's form changes the setup from the outside: show the summary then.
  const current = ready ? payoutDestination(setup) : null;
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (current) setEditing(false);
  }
  const save = async (method: PayoutMethod, handle: string) => {
    const result = await onSave(method, handle);
    if (!result?.error) setEditing(false);
    return result;
  };

  if (ready && !editing) {
    return (
      <Card className="max-w-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Payouts are on</h2>
            <p className="mt-1 break-words text-sm text-zinc-500">
              Your earnings go to <span className="font-medium text-zinc-900">{payoutDestination(setup)}</span>. You keep 100%.
            </p>
          </div>
        </div>
        {setup.lastFailure && <Failure text={setup.lastFailure} />}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
          <Button
            variant="secondary"
            onClick={() => {
              setChoice(setup.method);
              setEditing(true);
            }}
          >
            Change method
          </Button>
          {setup.method === 'stripe' && manageStripe}
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <Card className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">How do you want to get paid?</h2>
        {setup.lastFailure && <Failure text={setup.lastFailure} />}
        <div role="radiogroup" aria-label="Payout method" className={cn('mt-4 grid grid-cols-1 gap-2', methods.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {OPTIONS.filter((o) => methods.includes(o.method)).map((o) => (
            <button
              key={o.method}
              type="button"
              role="radio"
              aria-checked={choice === o.method}
              onClick={() => setChoice(o.method)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition sm:flex-col sm:gap-2',
                choice === o.method ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <span className={cn('mt-0.5 [&>svg]:size-5', choice === o.method ? 'text-zinc-900' : 'text-zinc-400')}>{o.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{PAYOUT_METHOD_LABEL[o.method]}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{o.detail}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-5">
          {choice === 'stripe' ? (
            setup.stripeReady ? (
              <SaveRow label="Your bank or debit card is already connected through Stripe." onSave={() => save('stripe', '')} button="Use bank or debit card" />
            ) : (
              stripeForm
            )
          ) : (
            <HandleForm key={choice} method={choice} initial={setup.method === choice ? setup.handle : null} onSave={save} />
          )}
        </div>
        {ready && (
          <button type="button" onClick={() => setEditing(false)} className="mt-4 text-sm text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline">
            Keep {payoutDestination(setup)}
          </button>
        )}
      </Card>
      <Card className="space-y-4 text-sm">
        <Point title="No fees for you" body="You keep 100% of what you earn. We cover the transfer costs." />
        <Point title="Bank or debit card" body="Stripe checks your identity once: name, date of birth, address and the last 4 digits of your SSN." />
        {methods.includes('paypal') && <Point title="PayPal or Venmo" body="We only need your email or mobile number. Payouts nobody claims come back after 30 days." />}
      </Card>
    </div>
  );
}

function HandleForm({ method, initial, onSave }: { method: 'paypal' | 'venmo'; initial: string | null; onSave: (m: PayoutMethod, h: string) => Promise<ActionState> | ActionState }) {
  const [value, setValue] = useState(initial ? (method === 'venmo' ? formatUsPhone(initial) : initial) : '');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ActionState>();
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const result = await onSave(method, value);
        setBusy(false);
        if (result?.error) setState(result);
      }}
    >
      {method === 'paypal' ? (
        <Field label="PayPal email" hint="Use the email on your PayPal account so the money lands straight in it.">
          <Input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      ) : (
        <Field label="Venmo mobile number" hint="The US number on your Venmo account.">
          <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="(201) 555-0123" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      )}
      <FormMessage state={state} />
      <Button type="submit" disabled={busy || !value.trim()}>
        {busy ? 'Saving…' : `Save ${PAYOUT_METHOD_LABEL[method]}`}
      </Button>
    </form>
  );
}

function SaveRow({ label, button, onSave }: { label: string; button: string; onSave: () => Promise<ActionState> | ActionState }) {
  const [state, setState] = useState<ActionState>();
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">{label}</p>
      <FormMessage state={state} />
      <Button
        onClick={async () => {
          const result = await onSave();
          if (result?.error) setState(result);
        }}
      >
        {button}
      </Button>
    </div>
  );
}

function Failure({ text }: { text: string }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-zinc-500">{body}</p>
    </div>
  );
}
