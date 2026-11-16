'use client';

import { useEffect, useState } from 'react';
import { CARD_FIXED_USD } from '@/lib/card-fees';
import { usdCents } from '@/lib/format';
import { cn } from '../ui/cn';

// Stripe's card rates for Atlas (Portugal account), before currency conversion. See card-fees.ts.
const ROWS = [
  { key: 'eu-debit', label: 'European debit card', pct: 1.5 },
  { key: 'eu-credit', label: 'European credit card', pct: 2.8 },
  { key: 'uk', label: 'UK card', pct: 2.5 },
  { key: 'other', label: 'Other cards (US, Canada, Australia…)', pct: 3.15 },
] as const;
const EEA = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IS IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE'.split(' '));

/** The region the browser says it's in (e.g. en-GB → GB), to point at the card that's likely cheapest. */
function guessRegion(): 'eu' | 'uk' | 'other' {
  const region = (navigator.languages?.[0] ?? navigator.language ?? '').split('-')[1]?.toUpperCase() ?? '';
  if (region === 'GB') return 'uk';
  return EEA.has(region) ? 'eu' : 'other';
}

/**
 * Card fees by card type, before the card is entered. The exact fee for the card actually used is
 * shown after it's typed in. Apple Pay and Google Pay cost the same as the card inside them.
 * `fx` is the currency-conversion part (STRIPE_FX_PERCENT).
 */
export function FeeGuide({ amount, fx }: { amount: number | null; fx: number }) {
  const [region, setRegion] = useState<'eu' | 'uk' | 'other' | null>(null);
  useEffect(() => setRegion(guessRegion()), []);
  const mine = region === 'eu' ? 'eu-debit' : region === 'uk' ? 'uk' : region === 'other' ? 'other' : null;
  return (
    <details className="group mt-4 rounded-xl border border-zinc-200 px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
        Card fees by card type
        <span className="text-xs text-zinc-500 group-open:hidden">Show</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {ROWS.map((r) => {
          const pct = Math.round((r.pct + fx) * 100) / 100;
          const fee = amount ? Math.round(((amount + CARD_FIXED_USD) / (1 - pct / 100) - amount) * 100) / 100 : null;
          return (
            <li key={r.key} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                {r.label}
                {r.key === 'eu-debit' && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-ink">Lowest fees</span>}
                {r.key === mine && r.key !== 'eu-debit' && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">Likely your card</span>}
              </span>
              <span className={cn('shrink-0 tabular-nums', r.key === mine ? 'font-semibold' : 'text-zinc-500')}>
                {pct}% + {usdCents(CARD_FIXED_USD)}
                {fee != null && <span className="ml-1.5 text-xs text-zinc-500">≈ {usdCents(fee)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-500">
        {region === 'eu' ? 'Tip: pay with a European debit card for the lowest fee. ' : ''}Apple Pay and Google Pay cost the same as the card inside them. The exact fee for your card shows after you enter it, before you pay.
      </p>
    </details>
  );
}
