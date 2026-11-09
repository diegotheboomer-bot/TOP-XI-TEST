'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ActionState } from '@/actions/result';
import { FormMessage } from '../form-message';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';

const STEPS = ['About you', 'Bank account', 'Review'] as const;

/**
 * Demo stand-in for Stripe's embedded onboarding: the same three stages
 * (identity, bank, review and agree), prefilled with Stripe's test values.
 */
export function MockOnboarding({ onDone }: { onDone: () => Promise<ActionState> | ActionState }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ActionState>();
  const [v, setV] = useState({ first: 'Alex', last: 'Morgan', dob: '2000-01-01', ssn: '0000', routing: '110000000', account: '000123456789' });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  function next(e: React.FormEvent) {
    e.preventDefault();
    const error =
      step === 0 && (!v.first.trim() || !v.last.trim() || !v.dob || !/^\d{4}$/.test(v.ssn))
        ? 'Fill in your name, date of birth and the last 4 of your SSN.'
        : step === 1 && (!/^\d{9}$/.test(v.routing) || !/^\d{4,17}$/.test(v.account))
          ? 'Routing numbers have 9 digits; account numbers 4 to 17.'
          : undefined;
    setState(error ? { error } : undefined);
    if (!error) setStep(step + 1);
  }

  async function submit() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    const result = await onDone();
    setBusy(false);
    if (result?.error) setState(result);
  }

  return (
    <div>
      <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Demo form with test values. Nothing is sent to Stripe; don’t enter real details.</p>
      <ol className="mb-6 flex items-center gap-2 text-[13px]" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium',
                i < step ? 'bg-accent-600 text-white' : i === step ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('truncate', i === step ? 'font-medium text-zinc-900' : 'text-zinc-500')}>{label}</span>
          </li>
        ))}
      </ol>

      {step < 2 ? (
        <form onSubmit={next} noValidate className="space-y-4">
          {step === 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Legal first name">
                  <Input value={v.first} onChange={set('first')} autoComplete="off" />
                </Field>
                <Field label="Legal last name">
                  <Input value={v.last} onChange={set('last')} autoComplete="off" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date of birth">
                  <Input type="date" value={v.dob} onChange={set('dob')} />
                </Field>
                <Field label="SSN, last 4 digits">
                  <Input inputMode="numeric" maxLength={4} value={v.ssn} onChange={set('ssn')} autoComplete="off" />
                </Field>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Routing number">
                <Input inputMode="numeric" maxLength={9} value={v.routing} onChange={set('routing')} autoComplete="off" />
              </Field>
              <Field label="Account number">
                <Input inputMode="numeric" maxLength={17} value={v.account} onChange={set('account')} autoComplete="off" />
              </Field>
            </div>
          )}
          <FormMessage state={state} />
          <div className="flex justify-between gap-2 pt-1">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">Continue</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 text-sm">
            <Row label="Name" value={`${v.first} ${v.last}`} />
            <Row label="Date of birth" value={v.dob} />
            <Row label="Bank account" value={`•••• ${v.account.slice(-4)}`} />
          </dl>
          <p className="text-xs text-zinc-500">By submitting you agree to the Stripe Connected Account Agreement. In the real app this step is Stripe’s own form.</p>
          <FormMessage state={state} />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button" onClick={submit} disabled={busy}>
              {busy ? 'Submitting…' : 'Agree and submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-2.5">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
