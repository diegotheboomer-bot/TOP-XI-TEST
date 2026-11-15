import Link from 'next/link';
import { ArrowRight, Banknote, Landmark } from 'lucide-react';
import { getMoneyAlert } from '@/lib/data';
import { usdCents } from '@/lib/format';

/** Shown on every clipper page when there's money to act on. */
export async function MoneyAlert() {
  const alert = await getMoneyAlert().catch(() => null);
  if (!alert) return null;
  const connect = alert.kind === 'connect';
  return (
    <Link
      href={connect ? '/clipper/payouts' : '/clipper/earnings'}
      className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-a/10 px-4 py-3 ring-1 ring-inset ring-brand-a/30 transition hover:bg-brand-a/15"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">{connect ? <Landmark className="size-4" /> : <Banknote className="size-4" />}</span>
      <span className="min-w-0 flex-1 text-sm">
        <b className="block">{connect ? `You’ve earned ${usdCents(alert.amount)}` : `${usdCents(alert.amount)} is ready to cash out`}</b>
        <span className="block text-zinc-500">{connect ? 'Connect your bank to get paid.' : 'Send it to your bank in one tap.'}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" />
    </Link>
  );
}
