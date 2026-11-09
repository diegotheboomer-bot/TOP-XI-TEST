'use client';

import { useState } from 'react';
import { streamerCharge } from '@/lib/payout';
import { usd, usdCents } from '@/lib/format';
import { Input } from '../ui/field';

/**
 * Budget input with the fee shown live, so the streamer sees exactly what
 * they'll pay before checkout. Shared by the app and the standalone demo.
 */
export function DepositFields({ id, feePercent, submit }: { id: string; feePercent: number; submit: React.ReactNode }) {
  const [value, setValue] = useState('');
  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount > 0;
  const c = streamerCharge(valid ? amount : 0, feePercent);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-zinc-400">$</span>
          <Input
            id={id}
            name="amount"
            type="number"
            inputMode="decimal"
            min="50"
            step="1"
            required
            placeholder="1,000"
            aria-label="Budget to add"
            className="pl-7"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        {submit}
      </div>
      <dl className="space-y-1 rounded-lg bg-zinc-50 px-3.5 py-2.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Clipper budget</dt>
          <dd className="tabular-nums">{valid ? usd(c.budget) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">Platform fee ({feePercent}%)</dt>
          <dd className="tabular-nums">{valid ? usdCents(c.fee) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-zinc-200 pt-1 font-medium">
          <dt>You pay</dt>
          <dd className="tabular-nums">{valid ? usdCents(c.total) : '—'}</dd>
        </div>
      </dl>
      <p className="text-xs text-zinc-500">All of the budget goes to clippers. They pay no fees.</p>
    </div>
  );
}
