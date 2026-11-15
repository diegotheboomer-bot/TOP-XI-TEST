import Link from 'next/link';
import { cn } from './ui/cn';

/** Earnings and Payouts are one place: two tabs at the top of both pages. */
export function MoneyTabs({ current }: { current: 'earnings' | 'payouts' }) {
  const tabs: ['earnings' | 'payouts', string, string][] = [
    ['earnings', 'Earnings', '/clipper/earnings'],
    ['payouts', 'Payouts', '/clipper/payouts'],
  ];
  return (
    <nav className="flex gap-1" aria-label="Money">
      {tabs.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={key === current ? 'page' : undefined}
          className={cn('inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition', key === current ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900')}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
