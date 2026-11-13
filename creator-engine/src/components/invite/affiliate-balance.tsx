'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Wallet } from 'lucide-react';
import type { ActionState } from '@/actions/result';
import { usdCents } from '@/lib/format';
import { cn } from '../ui/cn';

/** The business's affiliate balance: add it to a campaign (a discount) or cash it out. */
export function AffiliateBalance({
  balance,
  minCashout,
  payoutsEnabled,
  campaigns,
  apply,
  cashOut,
}: {
  balance: number;
  minCashout: number;
  payoutsEnabled: boolean;
  campaigns: { id: string; title: string; status: string }[];
  apply: (campaignId: string) => Promise<ActionState>;
  cashOut: () => Promise<ActionState>;
}) {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const r = await fn();
      setState(r);
      if (r?.success) router.refresh();
    });
  const btn = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50';
  return (
    <div className="rounded-2xl bg-zinc-100/50 p-4 ring-1 ring-inset ring-zinc-200/60 sm:p-5">
      <p className="text-xs text-zinc-500">Affiliate balance</p>
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-brand">{usdCents(balance)}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="flex gap-2">
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            aria-label="Campaign"
            className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
          >
            {campaigns.length ? campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}{c.status === 'draft' ? ' (draft)' : ''}</option>) : <option value="">No running campaign</option>}
          </select>
          <button type="button" disabled={pending || !campaignId || balance <= 0} onClick={() => run(() => apply(campaignId))} className={cn(btn, 'bg-brand text-brand-ink hover:brightness-110')}>
            <Wallet className="size-4" /> Use as budget
          </button>
        </div>
        {payoutsEnabled ? (
          <button type="button" disabled={pending || balance < minCashout} onClick={() => run(cashOut)} className={cn(btn, 'border border-zinc-200 bg-white hover:bg-zinc-50')}>
            <Banknote className="size-4" /> Cash out
          </button>
        ) : (
          <Link href="/streamer/payouts" className={cn(btn, 'border border-zinc-200 bg-white hover:bg-zinc-50')}>
            <Banknote className="size-4" /> Set up cash-out
          </Link>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Use it as a discount on any campaign, or cash out from {usdCents(minCashout)} (Stripe’s payout fee comes off).</p>
      {state?.error && <p className="mt-2 text-sm text-rose-600">{state.error}</p>}
      {state?.success && <p className="mt-2 text-sm text-[rgb(var(--brand-ta))]">{state.success}</p>}
    </div>
  );
}
