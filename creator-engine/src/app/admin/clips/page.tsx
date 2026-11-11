import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Search } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from '@/actions/support';
import { clipRef, compact, usdCents } from '@/lib/format';
import { SubmissionBadge } from '@/components/status';
import type { SubmissionStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Find a clip', robots: { index: false } };

/** "CLP-3F9A12C4", "3f9a12c4" or a full id → the id range to search. */
function rangeOf(q: string): [string, string] | null {
  const hex = q.trim().toLowerCase().replace(/^clp-/, '').replace(/-/g, '');
  if (!/^[0-9a-f]{8,32}$/.test(hex)) return null;
  const pad = (c: string) => (hex + c.repeat(32)).slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  return [pad('0'), pad('f')];
}

/** Atlas team only: look up a clip by its reference, for disputes and support. */
export default async function FindClipPage({ searchParams }: { searchParams: { q?: string } }) {
  if (!(await isSupportAdmin())) notFound();
  const q = (searchParams.q ?? '').trim();
  const range = q ? rangeOf(q) : null;
  const admin = createAdminClient();
  const { data: clips } = range
    ? await admin.from('submissions').select('*, campaigns(id, title, brand_id, brands(name))').gte('id', range[0]).lte('id', range[1]).limit(10)
    : { data: [] };
  const ids = (clips ?? []).map((c) => c.id as string);
  const creatorIds = [...new Set((clips ?? []).map((c) => c.creator_id as string))];
  const [{ data: ledger }, { data: creators }] = await Promise.all([
    ids.length ? admin.from('escrow_ledger').select('submission_id, entry_type, amount, stripe_object_id, created_at').in('submission_id', ids).order('created_at') : Promise.resolve({ data: [] }),
    creatorIds.length ? admin.from('creators').select('id, display_name').in('id', creatorIds) : Promise.resolve({ data: [] }),
  ]);
  const name = new Map((creators ?? []).map((c) => [c.id as string, c.display_name as string]));
  const at = (v: unknown) => (v ? new Date(v as string).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  return (
    <main className="gutter mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Find a clip</h1>
      <p className="mt-1 text-sm text-zinc-500">Paste the clip reference (like CLP-3F9A12C4) from a dispute or ticket.</p>
      <form className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input name="q" defaultValue={q} placeholder="CLP-…" autoFocus className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 font-mono text-sm uppercase" />
      </form>
      {q && !range && <p className="mt-4 text-sm text-rose-600">That isn’t a clip reference. It looks like CLP- and 8 letters or numbers.</p>}
      {range && !clips?.length && <p className="mt-4 text-sm text-zinc-500">No clip with that reference.</p>}
      <div className="mt-6 space-y-4">
        {(clips ?? []).map((c) => {
          const camp = c.campaigns as unknown as { id: string; title: string; brands: { name: string } | null } | null;
          const rows = (ledger ?? []).filter((l) => l.submission_id === c.id);
          return (
            <section key={c.id} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-lg font-semibold">{clipRef(c.id)}</p>
                <SubmissionBadge status={c.status as SubmissionStatus} />
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {(
                  [
                    ['Campaign', camp ? <Link key="c" href={`/streamer/campaigns/${camp.id}`} className="underline">{camp.title}</Link> : '—'],
                    ['Business', camp?.brands?.name ?? '—'],
                    ['Clipper', name.get(c.creator_id as string) ?? '—'],
                    ['Video', <a key="v" href={c.video_url as string} target="_blank" rel="noreferrer" className="break-all underline">{c.platform as string}</a>],
                    ['Views', compact(Number(c.current_view_count))],
                    ['Earned / paid', `${usdCents(Number(c.payout_earned))} / ${usdCents(Number(c.payout_transferred))}`],
                    ['Posted', at(c.created_at)],
                    ['Approved', at(c.approved_at)],
                    ['Fraud score', String(c.fraud_score)],
                    ['Flag reason', (c.flag_reason as string | null) ?? '—'],
                    ['Full id', <span key="i" className="select-all break-all font-mono text-xs">{c.id as string}</span>],
                  ] as [string, React.ReactNode][]
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-zinc-100 py-1.5 sm:block sm:border-0 sm:py-0">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="text-right font-medium sm:text-left">{v}</dd>
                  </div>
                ))}
              </dl>
              <h2 className="mt-5 text-sm font-semibold">Money</h2>
              {rows.length ? (
                <ul className="mt-2 divide-y divide-zinc-100 text-sm">
                  {rows.map((l, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>{l.entry_type === 'creator_payout' ? 'Paid to clipper' : 'Atlas fee'} · {at(l.created_at)}</span>
                      <span className="font-mono text-xs text-zinc-500">{l.stripe_object_id as string}</span>
                      <span className="font-semibold tabular-nums">{usdCents(Number(l.amount))}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Nothing paid for this clip yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
