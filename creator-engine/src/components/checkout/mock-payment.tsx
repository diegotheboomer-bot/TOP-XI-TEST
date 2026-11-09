'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import type { ActionState } from '@/actions/result';
import { FormMessage } from '../form-message';
import { PayButton, type Quote } from './fund-checkout';

const DECLINE = '4000000000000002'; // Stripe's test number for a generic decline

const digits = (v: string) => v.replace(/\D/g, '');
const groupCard = (v: string) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
function groupExpiry(v: string) {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

function cardError(number: string, expiry: string, cvc: string): string | undefined {
  if (digits(number).length !== 16) return 'Your card number is incomplete.';
  const [mm, yy] = [Number(digits(expiry).slice(0, 2)), Number(digits(expiry).slice(2))];
  const now = new Date();
  if (digits(expiry).length !== 4 || mm < 1 || mm > 12) return 'Your card’s expiry date is incomplete.';
  if (2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) return 'Your card’s expiry year is in the past.';
  if (!/^\d{3,4}$/.test(cvc)) return 'Your card’s security code is incomplete.';
  if (digits(number) === DECLINE) return 'Your card was declined.';
}

/**
 * Demo stand-in for Stripe's Payment Element: same layout and messages,
 * no network calls. Prefilled with Stripe's 4242 test card.
 */
export function MockPayment({ quote, onPay, onPaid }: { quote: Quote | null; onPay: (amount: number) => Promise<ActionState> | ActionState; onPaid: () => void }) {
  const [number, setNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 34');
  const [cvc, setCvc] = useState('123');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ActionState>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    const error = cardError(number, expiry, cvc);
    if (error) return setState({ error });
    setBusy(true);
    setState(undefined);
    await new Promise((r) => setTimeout(r, 900)); // feels like a real authorisation
    const result = await onPay(quote.amount);
    setBusy(false);
    if (result?.error) return setState(result);
    onPaid();
  }

  const box = 'w-full bg-transparent px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none';
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Demo checkout. Nothing is charged; don’t enter a real card.</p>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-zinc-700">Card</span>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white transition focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5">
          <div className="flex items-center border-b border-zinc-200 pr-3.5">
            <input
              aria-label="Card number"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1234 1234 1234 1234"
              value={number}
              onChange={(e) => setNumber(groupCard(e.target.value))}
              className={`${box} h-11 tabular-nums`}
            />
            <CreditCard className="size-4 shrink-0 text-zinc-400" />
          </div>
          <div className="grid grid-cols-2 divide-x divide-zinc-200">
            <input aria-label="Expiry date" inputMode="numeric" autoComplete="off" placeholder="MM / YY" value={expiry} onChange={(e) => setExpiry(groupExpiry(e.target.value))} className={`${box} h-11 tabular-nums`} />
            <input aria-label="Security code" inputMode="numeric" autoComplete="off" placeholder="CVC" value={cvc} onChange={(e) => setCvc(digits(e.target.value).slice(0, 4))} className={`${box} h-11 tabular-nums`} />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">Try 4000 0000 0000 0002 to see a declined card.</p>
      </div>
      <FormMessage state={state} />
      <PayButton quote={quote} busy={busy} />
    </form>
  );
}
