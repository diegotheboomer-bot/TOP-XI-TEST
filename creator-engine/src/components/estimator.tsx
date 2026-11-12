'use client';

import { useState } from 'react';
import { calculatePayout, type PayoutTerms } from '@/lib/payout';
import { compact, usd, usdCents } from '@/lib/format';
import { Input } from './ui/field';
import { payoutFee } from '@/lib/tiers';

const VIEW_STEPS = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000];

/** What a clipper would take home for a given result, after the Silver payout fee (lower tiers pay less). */
export function EarningsEstimator({ terms }: { terms: PayoutTerms }) {
  const cps = terms.payout_model === 'cps_performance';
  const [step, setStep] = useState(3);
  const [orders, setOrders] = useState(40);
  const [orderValue, setOrderValue] = useState('40');

  const views = VIEW_STEPS[step];
  const aov = Math.max(0, Number(orderValue) || 0);
  const gross = calculatePayout(terms, views, cps ? orders * aov : 0);
  const capped = gross >= terms.cpm_cap;
  const net = gross - payoutFee(gross, 'silver');

  return (
    <div className="space-y-5">
      {cps ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <label className="block min-w-0">
            <span className="flex justify-between text-sm">
              <span className="text-zinc-500">Orders with your code</span>
              <span className="font-medium tabular-nums">{orders}</span>
            </span>
            <input id="est-orders" type="range" min={0} max={500} step={5} value={orders} onChange={(e) => setOrders(Number(e.target.value))} className="mt-2 w-full accent-zinc-900" />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-500">Avg. order</span>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">$</span>
              <Input id="est-aov" type="number" inputMode="decimal" min="0" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} className="h-9 pl-6" />
            </div>
          </label>
        </div>
      ) : (
        <label className="block">
          <span className="flex justify-between text-sm">
            <span className="text-zinc-500">If your video gets</span>
            <span className="font-medium tabular-nums">{compact(views)} views</span>
          </span>
          <input id="est-views" type="range" min={0} max={VIEW_STEPS.length - 1} step={1} value={step} onChange={(e) => setStep(Number(e.target.value))} className="mt-2 w-full accent-zinc-900" />
        </label>
      )}
      <div className="flex items-end justify-between gap-4 rounded-lg bg-zinc-50 px-4 py-3">
        <div>
          <p className="text-xs text-zinc-500">You take home</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{usdCents(net)}</p>
        </div>
        <p className="text-right text-xs text-zinc-500">
          After the 2% fee, before Stripe’s payout fee
          {capped && <span className="block font-medium text-amber-700">Capped at {usd(terms.cpm_cap)}</span>}
        </p>
      </div>
    </div>
  );
}
