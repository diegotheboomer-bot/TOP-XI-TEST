'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Landmark, Mail, Smartphone } from 'lucide-react';
import type { ActionState } from '@/actions/result';
import { PAYOUT_METHODS, PAYOUT_METHOD_LABEL, payoutDestination, payoutReady, formatUsPhone, type PayoutMethod, type PayoutSetup } from '@/lib/payout-methods';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';
import { FormMessage } from '../form-message';

const OPTIONS: { method: PayoutMethod; icon: React.ReactNode; detail: string }[] = [
  { method: 'stripe', icon: <Landmark />, detail: 'Bank account (IBAN) through Stripe. Debit card where Stripe offers it, like the US.' },
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
  summary,
}: {
  /** Paid out / on the way, shown on the "Payouts are on" card. */
  summary?: { paid: string; owed: string };
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
      <Card className="relative max-w-xl overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-brand opacity-[0.08] blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Tile on>{OPTIONS.find((o) => o.method === setup.method)?.icon}</Tile>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--brand-ta))]">
              <span className="hero-pulse size-1.5 rounded-full bg-brand-b" /> Payouts are on
            </p>
            <p className="mt-0.5 break-words text-lg font-semibold tracking-tight">{payoutDestination(setup)}</p>
          </div>
        </div>
        {summary && (
          <div className="relative mt-5 grid grid-cols-2 divide-x divide-zinc-200/80 rounded-xl bg-zinc-50">
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">Paid out</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{summary.paid}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-zinc-500">On the way</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-brand">{summary.owed}</p>
            </div>
          </div>
        )}
        <p className="relative mt-4 text-sm text-zinc-500">Cash out from Earnings once a clip is approved and its hold has passed: 3 days at Silver, as little as 12 hours at Majesty.</p>
        {setup.lastFailure && <Failure text={setup.lastFailure} />}
        <div className="relative mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
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
                'relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition sm:flex-col sm:items-start sm:gap-3',
                choice === o.method ? 'border-brand-b/60 bg-brand-a/10' : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <Tile on={choice === o.method}>{o.icon}</Tile>
              <span className={cn('absolute right-3 top-3 grid size-4 place-items-center rounded-full transition', choice === o.method ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
                {choice === o.method && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className="min-w-0 pr-5 sm:pr-0">
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
      <Card className="space-y-4 text-sm lg:sticky lg:top-6">
        <Point title="Fees" body="A flat 5% at every tier, plus Stripe’s payout fee: 0.25% + $0.15, and $2.40 on the first cash-out each month. Both are shown before you confirm. Cash out from $5." />
        <Point title="Bank account" body="Stripe checks who you are once: name, date of birth, address and your bank details. Sometimes a photo of your ID." />
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

function Tile({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl transition [&>svg]:relative [&>svg]:size-5',
        on ? 'platform-tile bg-brand text-brand-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_4px_14px_-4px_rgb(var(--brand-b)/0.5)]' : 'bg-zinc-100 text-zinc-400',
      )}
    >
      {children}
    </span>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-zinc-500">{body}</p>
      </div>
    </div>
  );
}
