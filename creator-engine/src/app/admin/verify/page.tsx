import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from '@/actions/support';
import { setVerified, verifyDiscordMembers } from '@/actions/admin';
import { ActionButton } from '@/components/action-button';
import { StreamerAvatar, VerifiedMark } from '@/components/views';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify accounts', robots: { index: false } };

type Row = { id: string; name: string; avatar: string | null; verified: boolean; kind: 'creator' | 'brand' };

/** Give the verified badge to real businesses and trusted clippers. */
export default async function VerifyPage({ searchParams }: { searchParams: { q?: string } }) {
  if (!(await isSupportAdmin())) notFound();
  const admin = createAdminClient();
  const q = (searchParams.q ?? '').trim();
  let b = admin.from('brands').select('id, name, avatar_url, verified').order('created_at', { ascending: false }).limit(50);
  let c = admin.from('creators').select('id, display_name, avatar_url, verified').order('created_at', { ascending: false }).limit(50);
  if (q) {
    b = b.ilike('name', `%${q}%`);
    c = c.ilike('display_name', `%${q}%`);
  }
  const [{ data: brands }, { data: creators }] = await Promise.all([b, c]);
  const rows: Row[] = [
    ...(brands ?? []).map((x) => ({ id: x.id as string, name: x.name as string, avatar: x.avatar_url as string | null, verified: !!x.verified, kind: 'brand' as const })),
    ...(creators ?? []).map((x) => ({ id: x.id as string, name: x.display_name as string, avatar: x.avatar_url as string | null, verified: !!x.verified, kind: 'creator' as const })),
  ];
  return (
    <main className="gutter mx-auto max-w-3xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Verify accounts</h1>
      <p className="mt-1 text-sm text-zinc-500">Verified accounts get a check next to their name everywhere. Give it to real businesses and clippers you trust.</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
        <span className="text-sm">
          <b className="block">Discord: let current members in</b>
          <span className="text-zinc-500">Everyone in the server now gets Verified. New joiners still use #verify.</span>
        </span>
        <ActionButton action={verifyDiscordMembers}>Let them in</ActionButton>
      </div>
      <form className="mt-5">
        <input name="q" defaultValue={q} placeholder="Search by name" className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm" />
      </form>
      <ul className="mt-5 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
        {rows.map((r) => (
          <li key={r.kind + r.id} className="flex items-center gap-3 px-4 py-3">
            <StreamerAvatar name={r.name} size="md" src={r.avatar} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {r.name} {r.verified && <VerifiedMark />}
              </p>
              <p className="text-xs text-zinc-500">{r.kind === 'brand' ? 'Business' : 'Clipper'}</p>
            </div>
            <ActionButton variant={r.verified ? 'secondary' : 'primary'} action={setVerified.bind(null, r.kind, r.id, !r.verified)}>
              {r.verified ? 'Remove' : 'Verify'}
            </ActionButton>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-zinc-500">No accounts found.</li>}
      </ul>
    </main>
  );
}
