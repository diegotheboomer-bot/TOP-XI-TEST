import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Database, Trash2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from '@/actions/support';
import { loadTestData, removeTestData } from '@/actions/admin';
import { hasTestData, TEST_PASSWORD } from '@/lib/test-seed';
import { ActionButton } from '@/components/action-button';
import { MoneyTestForm } from '@/components/money-test-form';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const metadata: Metadata = { title: 'Test data', robots: { index: false } };

const LOGINS: [string, string][] = [
  ['streamer@atlas.test', 'Nova Plays: 43 campaigns, every pay model and state, ~400 clips to review'],
  ['agency@atlas.test', 'Peak Agency: campaigns for named clients'],
  ['clipper@atlas.test', 'Diggy (Platinum): earnings, invites waiting'],
  ['majesty@atlas.test', 'Majesty Max: 148 clips, 32M views'],
  ['newbrand@atlas.test', 'New business: welcome questions'],
  ['newclipper@atlas.test', 'New clipper: welcome questions'],
];

/** Atlas team only: load or remove fake test data on this site. */
export default async function TestDataPage() {
  if (process.env.LOCAL_TEST_ACCOUNTS !== '1' && !(await isSupportAdmin())) notFound();
  const admin = createAdminClient();
  const accounts = await hasTestData(admin);
  const { data: funded } = await admin.from('campaigns').select('id, title, escrow_balance, status').gt('escrow_balance', 0).neq('status', 'completed').order('created_at', { ascending: false }).limit(50);
  const campaigns = (funded ?? []).map((c) => ({ id: c.id as string, title: c.title as string, balance: Number(c.escrow_balance) }));
  return (
    <main className="gutter mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Test data</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Fake businesses, clippers, campaigns and clips for trying every screen. Every account is an @atlas.test email. Test clips are never synced with TikTok, YouTube or Instagram and never paid out.
      </p>

      <section className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
        <h2 className="font-semibold tracking-tight">Real money test</h2>
        <p className="mt-1 text-sm text-zinc-500">
          1. Fund one of your campaigns (you can deposit from $1). 2. Give your test clipper a balance from it here (cash-outs start at $5). 3. Sign in as that clipper and cash out. To get the rest back, cancel the campaign.
        </p>
        <MoneyTestForm campaigns={campaigns} />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
        <p className="text-sm font-medium">{accounts ? `Loaded: ${accounts} test accounts on the site.` : 'No test data on the site.'}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {accounts
            ? 'Anyone using the site sees the test campaigns and clippers until you remove them.'
            : 'Loading takes a minute or two. Keep this page open until it says Loaded.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {accounts ? (
            <ActionButton variant="danger" action={removeTestData}>
              <Trash2 className="size-4" /> Remove all test data
            </ActionButton>
          ) : (
            <ActionButton variant="primary" action={loadTestData}>
              <Database className="size-4" /> Load test data
            </ActionButton>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold tracking-tight">Test logins</h2>
        <p className="text-sm text-zinc-500">
          Password for all: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">{TEST_PASSWORD}</code>. Also clipper1 to clipper320 and brand1 to brand14 @atlas.test.
        </p>
        <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
          {LOGINS.map(([email, what]) => (
            <li key={email} className="px-4 py-3">
              <p className="font-mono text-sm">{email}</p>
              <p className="text-xs text-zinc-500">{what}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
