import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { TestMoney } from '@/components/test-money';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Money test', robots: { index: false } };

/** Temporary: a small real deposit and cash-out with the live Stripe keys. */
export default async function MoneyTestPage() {
  if (isDemo) redirect('/');
  if (!(await getViewer())) redirect('/login');
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return (
    <AuthShell title="Money test" subtitle="Real money, live Stripe. Use small amounts. Nothing is saved in the app’s database." wide>
      {pk ? <TestMoney publishableKey={pk} /> : <p className="text-sm text-rose-600">Stripe isn’t set up.</p>}
    </AuthShell>
  );
}
