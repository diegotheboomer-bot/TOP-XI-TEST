'use client';

import { useState } from 'react';
import { Check, Lock, Plus } from 'lucide-react';
import { streamerCharge } from '@/lib/payout';
import { DepositSchema } from '@/lib/schemas';
import { compact, usd, usdCents } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { cn } from '../ui/cn';
import { Button, buttonClass } from '../ui/button';
import { Dialog } from '../ui/dialog';

export interface Quote {
  /** Budget the streamer adds; all of it goes to clippers. */
  amount: number;
  fee: number;
  total: number;
  totalCents: number;
}

export type CheckoutCampaign = Pick<Campaign, 'id' | 'title' | 'payout_model' | 'cpm_rate' | 'status'>;

/** What the payment section renders: a quote to charge (null while the amount is invalid) and a callback for success. */
export type PaymentSlot = (quote: Quote | null, onPaid: () => void) => React.ReactNode;

const QUICK_PICKS = [500, 1000, 5000, 10000];

/**
 * "Add budget" button that opens the checkout in a popup: amount with the fee
 * on top, then the payment form (Stripe's Payment Element in the app, a mock
 * card form in the demo). `onDone` runs when a paid checkout is closed.
 */
export function AddBudget({
  campaign,
  feePercent,
  payment,
  note,
  onDone,
  className,
}: {
  campaign: CheckoutCampaign;
  feePercent: number;
  payment: PaymentSlot;
  /** Small print under the payment form. */
  note: React.ReactNode;
  onDone?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState<Quote | null>(null);
  const close = () => {
    setOpen(false);
    if (paid) onDone?.();
  };
  return (
    <>
      <Button
        type="button"
        className={className}
        onClick={() => {
          setPaid(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" /> Add budget
      </Button>
      <Dialog open={open} onClose={close} title={paid ? 'Payment received' : 'Add budget'} description={paid ? undefined : campaign.title}>
        {paid ? (
          <Paid quote={paid} feePercent={feePercent} title={campaign.title} draft={campaign.status === 'draft'} onClose={close} />
        ) : (
          <Checkout campaign={campaign} feePercent={feePercent} payment={payment} note={note} onPaid={setPaid} />
        )}
      </Dialog>
    </>
  );
}

function Checkout({
  campaign,
  feePercent,
  payment,
  note,
  onPaid,
}: {
  campaign: CheckoutCampaign;
  feePercent: number;
  payment: PaymentSlot;
  note: React.ReactNode;
  onPaid: (quote: Quote) => void;
}) {
  const [value, setValue] = useState('1000');
  const parsed = DepositSchema.safeParse(value);
  const quote: Quote | null = parsed.success ? toQuote(parsed.data, feePercent) : null;
  const error = value.trim() && !parsed.success ? parsed.error.issues[0].message : undefined;
  const views = quote && campaign.payout_model !== 'cps_performance' && campaign.cpm_rate > 0 ? (quote.amount / campaign.cpm_rate) * 1000 : null;

  return (
    <div>
      <label htmlFor="budget" className="block text-[13px] font-medium text-zinc-700">
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
        {error ?? (views ? `Pays for up to ${compact(views)} views at ${usdCents(campaign.cpm_rate)} per 1K.` : 'Between $50 and $1,000,000.')}
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
              quote?.amount === n ? 'border-transparent bg-brand text-brand-ink' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900',
            )}
          >
            {usd(n)}
          </button>
        ))}
      </div>

      <Breakdown quote={quote} feePercent={feePercent} className="mt-5" />
      <p className="mt-2.5 text-xs text-zinc-500">
        All of the budget goes to clippers. If you cancel the campaign, unspent budget is refunded to your card; the {feePercent}% fee isn’t refundable.
      </p>

      <div className="mt-6 border-t border-zinc-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold">Payment</h3>
        {payment(quote, () => quote && onPaid(quote))}
        <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
          <Lock className="mt-px size-3.5 shrink-0" />
          <span>{note}</span>
        </p>
      </div>
    </div>
  );
}

function Paid({ quote, feePercent, title, draft, onClose }: { quote: Quote; feePercent: number; title: string; draft: boolean; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700">
          <Check className="size-5" />
        </span>
        <p className="text-sm text-zinc-500">
          {usd(quote.amount)} is going into <span className="text-zinc-900">{title}</span> for clippers to earn.
        </p>
      </div>
      <Breakdown quote={quote} feePercent={feePercent} className="mt-5" />
      {draft && <p className="mt-3 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">Next: click <strong>Go live</strong> on the campaign page, so clippers can find it in Discover.</p>}
      <button type="button" onClick={onClose} className={buttonClass('primary', 'md', 'mt-5 w-full')}>
        Done
      </button>
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
        <dt className="text-zinc-500">Service fee ({feePercent}%, incl. card processing, non-refundable)</dt>
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
