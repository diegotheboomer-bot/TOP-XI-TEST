import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from '@/actions/support';
import { AdminTicket } from '@/components/support/admin-ticket';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Support inbox', robots: { index: false } };

/** The Atlas team's inbox: only emails in ADMIN_EMAILS can open it. */
export default async function SupportInbox({ searchParams }: { searchParams: { all?: string } }) {
  if (!(await isSupportAdmin())) notFound();
  let q = createAdminClient().from('support_tickets').select('*').order('created_at', { ascending: false }).limit(100);
  if (!searchParams.all) q = q.eq('status', 'open');
  const { data } = await q;
  return (
    <main className="gutter mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Support inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {searchParams.all ? 'All tickets.' : 'Open tickets.'}{' '}
        <a href={searchParams.all ? '/admin/support' : '/admin/support?all=1'} className="underline">
          {searchParams.all ? 'Show open only' : 'Show all'}
        </a>
      </p>
      <ul className="mt-6 space-y-4">
        {(data ?? []).length === 0 && <li className="text-sm text-zinc-500">Nothing here.</li>}
        {(data ?? []).map((t) => (
          <AdminTicket key={t.id as string} ticket={t as never} />
        ))}
      </ul>
    </main>
  );
}
