import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { TestMoney } from '@/components/test-money';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Money test', robots: { index: false } };

/** Temporary: deposit and cash out with Stripe test keys (fake money). */
export default async function MoneyTestPage() {
  if (isDemo) redirect('/');
  if (!(await getViewer())) redirect('/login');
  const pk = process.env.STRIPE_TEST_PUBLISHABLE_KEY?.trim();
  return (
    <AuthShell title="Money test" subtitle="Stripe test mode: fake money, nothing touches your live account or the database." wide>
      {pk?.startsWith('pk_test_') ? <TestMoney publishableKey={pk} /> : <p className="text-sm text-rose-600">Add STRIPE_TEST_PUBLISHABLE_KEY and STRIPE_TEST_SECRET_KEY (test keys) on Render.</p>}
    </AuthShell>
  );
}
