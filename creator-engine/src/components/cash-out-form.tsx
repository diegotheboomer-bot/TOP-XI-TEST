'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cashOut } from '@/actions/creator';
import type { ActionState } from '@/actions/result';
import { cn } from './ui/cn';
import { TIER_LABEL, TIER_PERKS, type Tier } from '@/lib/tiers';
import { MIN_CASHOUT } from '@/lib/payout-rules';

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
  const tooLittle = amount < MIN_CASHOUT;

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
        {feePct > 0 && (
          <div className="flex justify-between">
            <dt className="text-zinc-500">{feePct}% cash-out fee</dt>
            <dd className="tabular-nums">−{cents(fee)}</dd>
          </div>
        )}
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
      {!tooMuch && tooLittle && <p className="mt-2 text-sm text-zinc-500">The smallest cash-out is {cents(MIN_CASHOUT)}.</p>}
      <button
        type="button"
        disabled={pending || tooLittle || tooMuch}
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

/**
 * The cash-out button: one tap sends everything that's ready. "Choose an amount"
 * opens the form above for a partial cash-out. When cashing out isn't possible it
 * says why, and links to payout setup if that's what's missing.
 */
export function OneTapCashOut({
  balance,
  feePct,
  payoutsReady,
  blocked,
  nextUnlock,
  tier,
}: {
  tier: Tier;
  balance: number;
  feePct: number;
  payoutsReady: boolean;
  /** Why cashing out isn't possible right now (e.g. weekly limit), if it isn't. */
  blocked?: string;
  /** When the next held money unlocks, if any. */
  nextUnlock?: string;
}) {
  const router = useRouter();
  const [custom, setCustom] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const fee = Math.round(balance * feePct) / 100;
  const net = Math.max(0, balance - fee);
  const big = 'flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition';

  if (!payoutsReady)
    return (
      <a href="/clipper/payouts" className={cn(big, 'bg-brand text-brand-ink hover:brightness-110')}>
        Set up payouts to cash out →
      </a>
    );
  if (state?.success)
    return <p className="rounded-xl bg-brand-a/10 px-4 py-4 text-center text-sm font-medium ring-1 ring-inset ring-brand-a/30">{state.success}</p>;
  if (!blocked && balance >= 0.01 && balance < MIN_CASHOUT)
    return (
      <div>
        <button type="button" disabled className={cn(big, 'bg-zinc-100 text-zinc-400')}>
          Cash out from {cents(MIN_CASHOUT)}
        </button>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (balance / MIN_CASHOUT) * 100)}%` }} />
        </div>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {cents(MIN_CASHOUT - balance)} more to go. {nextUnlock ? `Your next money unlocks ${nextUnlock}.` : 'Keep clipping.'}
        </p>
      </div>
    );
  if (blocked || balance < 0.01)
    return (
      <div>
        <button type="button" disabled className={cn(big, 'bg-zinc-100 text-zinc-400')}>
          {blocked ? 'Cash-outs used for this week' : 'Nothing to cash out yet'}
        </button>
        <p className="mt-2 text-center text-xs text-zinc-500">{blocked ?? (nextUnlock ? `Your next money unlocks ${nextUnlock}.` : 'Approved earnings unlock after the hold.')}</p>
      </div>
    );
  if (custom) return <CashOutForm balance={balance} feePct={feePct} />;
  if (confirm) {
    const silverFee = Math.round(balance * TIER_PERKS.silver.feePct) / 100;
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Cash out</dt>
            <dd className="tabular-nums">{cents(balance)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-zinc-500">
              Cash-out fee {feePct > 0 && `${feePct}%`}
            </dt>
            <dd className="tabular-nums">{fee > 0 ? `−${cents(fee)}` : 'None'}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
            <dt>You receive</dt>
            <dd className="tabular-nums text-brand">{cents(net)}</dd>
          </div>
        </dl>
        {tier !== 'silver' && silverFee > fee && (
          <p className="mt-3 rounded-lg bg-brand-a/10 px-3 py-2 text-xs font-medium text-[rgb(var(--brand-ta))] ring-1 ring-inset ring-brand-a/30">
            Your {TIER_LABEL[tier]} tier saves you {cents(silverFee - fee)} on this cash-out.
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cashOut();
              setState(r);
              if (r?.success) router.refresh();
            })
          }
          className={cn(big, 'mt-4 bg-brand text-brand-ink hover:brightness-110 disabled:opacity-60')}
        >
          {pending ? 'Sending…' : `Confirm · get ${cents(net)}`}
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="mt-2 w-full text-center text-xs text-zinc-500 hover:text-zinc-900">
          Cancel
        </button>
        {state?.error && <p className="mt-2 text-center text-sm text-rose-600">{state.error}</p>}
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className={cn(big, 'bg-brand text-brand-ink shadow-[0_10px_30px_-12px_rgb(var(--brand-b)/0.8)] hover:brightness-110 active:scale-[0.99]')}
      >
        Cash out {cents(balance)}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-500">
        Straight to your payout account ·{' '}
        <button type="button" onClick={() => setCustom(true)} className="font-medium text-zinc-700 underline">
          Choose an amount
        </button>
      </p>
    </div>
  );
}
