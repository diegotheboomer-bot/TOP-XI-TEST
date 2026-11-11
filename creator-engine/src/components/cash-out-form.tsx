'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cashOut } from '@/actions/creator';
import type { ActionState } from '@/actions/result';
import { cn } from './ui/cn';

const cents = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Pick how much of the balance to send: type an amount or tap a quick pick, see the fee and what lands. */
export function CashOutForm({ balance, feePct }: { balance: number; feePct: number }) {
  const router = useRouter();
  const [value, setValue] = useState(balance.toFixed(2));
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const amount = Math.min(balance, Math.max(0, Math.floor((Number(value) || 0) * 100) / 100));
  const fee = Math.round(amount * feePct) / 100;
  const net = Math.max(0, amount - fee);
  const tooMuch = (Number(value) || 0) > balance + 0.001;

  return (
    <div>
      <label htmlFor="cash-amount" className="text-[13px] font-medium text-zinc-700">
        How much do you want to cash out?
      </label>
      <div className={cn('mt-1.5 flex items-center rounded-xl border bg-white px-4 transition focus-within:ring-4 focus-within:ring-zinc-900/5', tooMuch ? 'border-rose-300' : 'border-zinc-200')}>
        <span className="text-2xl font-medium text-zinc-400">$</span>
        <input
          id="cash-amount"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
          className="h-14 w-full min-w-0 bg-transparent pl-1.5 text-2xl font-semibold tabular-nums tracking-tight focus:outline-none"
        />
        <button type="button" onClick={() => setValue(balance.toFixed(2))} className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">
          Max
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[0.25, 0.5, 1].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue((Math.floor(balance * p * 100) / 100).toFixed(2))}
            className="h-8 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-300"
          >
            {p === 1 ? 'All' : `${p * 100}%`}
          </button>
        ))}
      </div>
      <dl className="mt-4 space-y-1.5 rounded-xl bg-zinc-50 px-4 py-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Cash out</dt>
          <dd className="tabular-nums">{cents(amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">{feePct}% tier fee</dt>
          <dd className="tabular-nums">−{cents(fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold">
          <dt>You receive</dt>
          <dd className="tabular-nums text-brand">{cents(net)}</dd>
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <dt>Stays in your balance</dt>
          <dd className="tabular-nums">{cents(Math.max(0, balance - amount))}</dd>
        </div>
      </dl>
      {tooMuch && <p className="mt-2 text-sm text-rose-600">You have {cents(balance)} available.</p>}
      <button
        type="button"
        disabled={pending || amount < 0.01 || tooMuch}
        onClick={() =>
          start(async () => {
            const r = await cashOut(amount);
            setState(r);
            if (r?.success) router.refresh();
          })
        }
        className="mt-4 h-11 w-full rounded-lg bg-brand text-sm font-semibold text-brand-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? 'Sending…' : `Cash out ${cents(net)}`}
      </button>
      {state?.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-[rgb(var(--brand-ta))]">{state.success}</p>}
    </div>
  );
}
