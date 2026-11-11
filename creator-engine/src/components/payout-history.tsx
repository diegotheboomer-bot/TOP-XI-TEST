// Clipper "Payouts" page: setup progress and every payout, with the clips each one covered.
import Link from 'next/link';
import { ArrowDownLeft, Check, ChevronDown, Landmark, Zap } from 'lucide-react';
import type { PayoutEvent } from '@/lib/data';
import { clipRef, usdCents } from '@/lib/format';
import { cn } from './ui/cn';

/** Three steps to getting paid, ticked off as they happen. */
export function PayoutSteps({ methodReady, methodLabel, approved, cashedOut }: { methodReady: boolean; methodLabel: string; approved: boolean; cashedOut: boolean }) {
  const steps: [string, string, boolean][] = [
    [methodReady ? `${methodLabel} connected` : 'Connect a payout method', methodReady ? 'Ready to receive money' : 'Set it up below. It takes about two minutes', methodReady],
    ['Get a clip approved', approved ? 'You’re earning' : 'Post to a campaign and wait for the owner’s approval', approved],
    ['Cash out', cashedOut ? 'Money sent to you' : 'From Earnings, once a clip’s hold has passed', cashedOut],
  ];
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {steps.map(([title, body, done], i) => (
        <li key={i} className={cn('flex items-start gap-3 rounded-2xl border p-4', done ? 'border-transparent bg-brand-a/10 ring-1 ring-inset ring-brand-a/30' : 'border-zinc-200/80 bg-white')}>
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', done ? 'bg-brand text-brand-ink' : 'border border-zinc-300 text-zinc-500')}>
            {done ? <Check className="size-4" strokeWidth={3.5} /> : i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{title}</span>
            <span className="block text-xs text-zinc-500">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Every payout, newest first. Open one to see which clips and campaigns it paid for. */
export function PayoutHistory({ events }: { events: PayoutEvent[] }) {
  const total = events.reduce((n, e) => n + e.received, 0);
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">Payout history</h2>
        {events.length > 0 && (
          <span className="text-xs text-zinc-500">
            {usdCents(total)} received · {events.length} {events.length === 1 ? 'payout' : 'payouts'}
          </span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center text-sm text-zinc-500">
          No payouts yet. When you cash out from{' '}
          <Link href="/clipper/earnings" className="font-medium underline">
            Earnings
          </Link>
          , it shows up here with every clip it covered.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e, i) => {
            const campaigns = [...new Set(e.clips.map((c) => c.campaignTitle))];
            return (
              <li key={i} className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-a/15 text-[rgb(var(--brand-ta))]">
                      {e.kind === 'cashout' ? <ArrowDownLeft className="size-4" /> : <Zap className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{e.kind === 'cashout' ? 'Cash-out' : 'Sent automatically'}</span>
                      <span className="block truncate text-xs text-zinc-500">
                        {when(e.at)}
                        {campaigns.length > 0 && ` · ${campaigns.length === 1 ? campaigns[0] : `${campaigns.length} campaigns`}`}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums text-brand">+{usdCents(e.received)}</span>
                      {e.fee > 0 && <span className="block text-[11px] tabular-nums text-zinc-500">{usdCents(e.fee)} fee</span>}
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="border-t border-zinc-100 px-4 pb-3 pt-1">
                    <p className="flex items-center gap-1.5 py-2 text-xs text-zinc-500">
                      <Landmark className="size-3.5" />
                      {e.kind === 'cashout' ? 'You cashed out. Sent to your payout method; banks usually take 2–3 business days.' : 'A campaign ended, so what you’d earned there was sent to you.'}
                    </p>
                    {e.clips.length ? (
                      <ul className="divide-y divide-zinc-100">
                        {e.clips.map((c) => (
                          <li key={`${c.clipId}-${c.at}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                            <span className="min-w-0">
                              <Link href={`/clipper/campaigns/${c.campaignId}`} className="block truncate text-sm font-medium hover:underline">
                                {c.campaignTitle}
                              </Link>
                              <span className="block truncate font-mono text-[11px] text-zinc-500">
                                {clipRef(c.clipId)}
                                {c.transferId ? ` · ${c.transferId}` : ''}
                              </span>
                            </span>
                            <span className="text-right text-sm tabular-nums">
                              {usdCents(c.gross - c.fee)}
                              {c.fee > 0 && <span className="block text-[11px] text-zinc-500">of {usdCents(c.gross)}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-2 text-xs text-zinc-500">Clip details aren’t available for this payout.</p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
