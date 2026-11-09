'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { streamerCharge } from '@/lib/payout';
import { DepositSchema } from '@/lib/schemas';
import { compact, usd, usdCents } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { Card } from '../ui/card';
import { cn } from '../ui/cn';
import { buttonClass } from '../ui/button';
import { CampaignCover, type LinkLike } from '../views';

export interface Quote {
  /** Budget the streamer adds; all of it goes to clippers. */
  amount: number;
  fee: number;
  total: number;
  totalCents: number;
}

export type CheckoutCampaign = Pick<Campaign, 'id' | 'title' | 'cover_color' | 'thumbnail_url' | 'payout_model' | 'cpm_rate' | 'escrow_balance'>;

/** What the payment column renders: a quote to charge (null while the amount is invalid) and a callback for success. */
export type PaymentSlot = (quote: Quote | null, onPaid: () => void) => React.ReactNode;

const QUICK_PICKS = [500, 1000, 5000, 10000];

/**
 * Checkout for adding budget to a campaign. The left column sets the amount
 * and shows the fee on top; the right column is the payment form (Stripe's
 * Payment Element in the app, a mock card form in the demo).
 */
export function FundCheckout({
  campaign,
  feePercent,
  backHref,
  link: Link = 'a',
  payment,
  note,
}: {
  campaign: CheckoutCampaign;
  feePercent: number;
  backHref: string;
  link?: LinkLike;
  payment: PaymentSlot;
  /** Small print under the payment form. */
  note: React.ReactNode;
}) {
  const [value, setValue] = useState('1000');
  const [paid, setPaid] = useState<Quote | null>(null);

  const parsed = DepositSchema.safeParse(value);
  const quote: Quote | null = parsed.success ? toQuote(parsed.data, feePercent) : null;
  const error = value.trim() && !parsed.success ? parsed.error.issues[0].message : undefined;
  const views = quote && campaign.payout_model !== 'cps_performance' && campaign.cpm_rate > 0 ? (quote.amount / campaign.cpm_rate) * 1000 : null;

  if (paid) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-50 text-accent-700">
          <Check className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Payment received</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          {usd(paid.amount)} is going into <span className="text-zinc-900">{campaign.title}</span> for clippers to earn.
        </p>
        <Breakdown quote={paid} feePercent={feePercent} className="mt-5 text-left" />
        <Link href={backHref} className={buttonClass('primary', 'md', 'mt-6 w-full')}>
          Back to campaign
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> {campaign.title}
      </Link>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] md:items-start">
        <Card>
          <div className="flex items-center gap-3">
            <CampaignCover campaign={campaign} brandName="" variant="thumb" showTitle={false} className="size-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">Add budget</h1>
              <p className="text-sm text-zinc-500">
                {campaign.title} · {usd(campaign.escrow_balance)} left now
              </p>
            </div>
          </div>

          <label htmlFor="budget" className="mt-6 block text-[13px] font-medium text-zinc-700">
            Budget for clippers
          </label>
          <div
            className={cn(
              'mt-1.5 flex items-center rounded-xl border bg-white px-4 transition focus-within:ring-4 focus-within:ring-zinc-900/5',
              error ? 'border-rose-200' : 'border-zinc-200 focus-within:border-zinc-400',
            )}
          >
            <span className="text-2xl font-medium text-zinc-400">$</span>
            <input
              id="budget"
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(cleanAmount(e.target.value))}
              aria-invalid={!!error}
              aria-describedby="budget-help"
              className="h-14 w-full min-w-0 bg-transparent pl-1.5 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 focus:outline-none"
            />
          </div>
          <p id="budget-help" className={cn('mt-1.5 text-xs', error ? 'text-rose-600' : 'text-zinc-500')}>
            {error ?? 'Between $50 and $1,000,000.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
            {QUICK_PICKS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setValue(String(n))}
                aria-pressed={quote?.amount === n}
                className={cn(
                  'h-8 rounded-full border px-3.5 text-[13px] font-medium tabular-nums transition',
                  quote?.amount === n ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
                )}
              >
                {usd(n)}
              </button>
            ))}
          </div>

          <Breakdown quote={quote} feePercent={feePercent} className="mt-6" />
          <p className="mt-3 text-xs text-zinc-500">
            {views ? `Pays for up to ${compact(views)} views at ${usdCents(campaign.cpm_rate)} per 1K. ` : ''}
            All of the budget goes to clippers. Unspent budget stays in the campaign.
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-semibold tracking-tight">Payment</h2>
          <div className="mt-4">{payment(quote, () => setPaid(quote))}</div>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-zinc-500">
            <Lock className="mt-px size-3.5 shrink-0" />
            <span>{note}</span>
          </p>
        </Card>
      </div>
    </div>
  );
}

/** Digits and one decimal point, at most two decimals. */
function cleanAmount(raw: string): string {
  const [whole, ...rest] = raw.replace(/[^\d.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export function toQuote(amount: number, feePercent: number): Quote {
  const c = streamerCharge(amount, feePercent);
  return { amount: c.budget, fee: c.fee, total: c.total, totalCents: Math.round(c.total * 100) };
}

function Breakdown({ quote, feePercent, className }: { quote: Quote | null; feePercent: number; className?: string }) {
  const row = 'flex justify-between gap-3';
  return (
    <dl className={cn('space-y-2 rounded-xl bg-zinc-50 px-4 py-3.5 text-sm', className)}>
      <div className={row}>
        <dt className="text-zinc-500">Clipper budget</dt>
        <dd className="tabular-nums">{quote ? usdCents(quote.amount) : '—'}</dd>
      </div>
      <div className={row}>
        <dt className="text-zinc-500">Platform fee ({feePercent}%)</dt>
        <dd className="tabular-nums">{quote ? usdCents(quote.fee) : '—'}</dd>
      </div>
      <div className={cn(row, 'border-t border-zinc-200 pt-2 font-semibold')}>
        <dt>Total</dt>
        <dd className="tabular-nums">{quote ? usdCents(quote.total) : '—'}</dd>
      </div>
    </dl>
  );
}

/** Pay button shared by the real and mock forms. */
export function PayButton({ quote, busy, disabled }: { quote: Quote | null; busy: boolean; disabled?: boolean }) {
  return (
    <button type="submit" disabled={!quote || busy || disabled} className={buttonClass('primary', 'md', 'h-11 w-full text-[15px]')}>
      {busy ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> Processing…
        </>
      ) : quote ? (
        `Pay ${usdCents(quote.total)}`
      ) : (
        'Pay'
      )}
    </button>
  );
}
