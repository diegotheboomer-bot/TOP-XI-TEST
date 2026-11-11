import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Receipt, RotateCcw, Wallet } from 'lucide-react';
import { getBrandMoney, type MoneyEntry } from '@/lib/data';
import { usd } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

const KIND: Record<MoneyEntry['kind'], { label: string; icon: React.ElementType; sign: string; tone: string }> = {
  deposit: { label: 'Budget added', icon: ArrowDownLeft, sign: '+', tone: 'text-[rgb(var(--brand-ta))]' },
  payout: { label: 'Paid to a clipper', icon: ArrowUpRight, sign: '−', tone: 'text-zinc-900' },
  refund: { label: 'Refunded to you', icon: RotateCcw, sign: '−', tone: 'text-zinc-900' },
  fee: { label: 'Card processing', icon: Receipt, sign: '', tone: 'text-zinc-500' },
};

export default async function MoneyPage() {
  const m = await getBrandMoney();
  return (
    <>
      <PageHeader title="Money" description="Every budget you’ve added, what clippers were paid, and what came back to you." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Held for clippers', m.held, 'Waiting to be earned or paid'],
          ['Budget added', m.added, 'Across all campaigns'],
          ['Paid to clippers', m.paidToClippers, 'Sent automatically'],
          ['Refunded to you', m.refunded, 'Unspent budget'],
        ].map(([k, v, h], i) => (
          <div key={k as string} className={cn('rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card', i === 0 && 'ring-1 ring-inset ring-brand-a/40')}>
            <p className="text-xs text-zinc-500">{k}</p>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', i === 0 && 'text-brand')}>{usd(v as number)}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{h}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-semibold tracking-tight">How your money moves</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          When you add a budget, it’s held safely for that campaign. Clippers are paid from it automatically once you approve their clips and the short hold
          passes. If you end a campaign, whatever wasn’t earned is refunded to your card. Card processing{m.fees > 0 ? ` (${usd(m.fees)} so far)` : ''} is
          the only fee, and it isn’t refundable.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold tracking-tight">History</h2>
        {m.entries.length === 0 ? (
          <Empty icon={<Wallet />} title="Nothing yet" body="Add a budget to a campaign and it shows up here." />
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
            {m.entries.map((e) => {
              const k = KIND[e.kind];
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600">
                    <k.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{k.label}</p>
                    <Link href={`/streamer/campaigns/${e.campaignId}`} className="block truncate text-xs text-zinc-500 hover:text-zinc-900">
                      {e.campaignTitle} · {new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Link>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', k.tone)}>
                    {k.sign}
                    {usd(e.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
