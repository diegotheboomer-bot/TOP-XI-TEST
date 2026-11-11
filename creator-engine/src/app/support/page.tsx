import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppLayout } from '@/components/app-layout';
import { PageHeader } from '@/components/ui/page-header';
import { SupportChat } from '@/components/support/support-chat';

export const dynamic = 'force-dynamic';

type Ticket = { id: string; subject: string; status: string; reply: string | null; created_at: string };

export default async function SupportPage() {
  const viewer = isDemo ? null : await getViewer();
  if (!isDemo && !viewer) redirect('/login');
  const role = viewer?.creatorId && !viewer.brandId ? 'clipper' : 'streamer';
  const { data } = viewer
    ? await createAdminClient().from('support_tickets').select('id, subject, status, reply, created_at').eq('user_id', viewer.userId).order('created_at', { ascending: false }).limit(20)
    : { data: [] as Ticket[] };
  const tickets = (data ?? []) as Ticket[];
  return (
    <AppLayout role={role}>
      <PageHeader title="Support" description="Ask the assistant first. If it can’t help, open a ticket and a person from the Atlas team will reply." />
      <SupportChat />
      {tickets.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold tracking-tight">Your tickets</h2>
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{t.subject}</p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: t.status === 'resolved' ? '#22c55e' : '#f59e0b', backgroundColor: t.status === 'resolved' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }}>
                    {t.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                {t.reply && <p className="mt-3 whitespace-pre-line rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-700"><span className="font-medium">Atlas team: </span>{t.reply}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppLayout>
  );
}
