'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { inviteMany } from '@/actions/brand';
import type { ActionState } from '@/actions/result';
import { Dialog } from './ui/dialog';

/** Invite every clipper the current Scout filters show, to one campaign. */
export function InviteAllButton({ creatorIds, campaigns, preselect }: { creatorIds: string[]; campaigns: { id: string; title: string; draft: boolean }[]; preselect?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(preselect ?? campaigns[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  if (!creatorIds.length || !campaigns.length) return null;
  const n = Math.min(creatorIds.length, 500);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState(undefined);
          setOpen(true);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium transition hover:bg-zinc-50"
      >
        <Users className="size-4" /> Invite all {n}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Invite ${n} clippers`} description="Everyone your filters show right now. Anyone already in the campaign or invited is skipped.">
        {state?.success ? (
          <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">{state.success}</p>
        ) : (
          <div className="space-y-4">
            <label className="block text-[13px] font-medium text-zinc-700">
              Campaign
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal">
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.draft ? ' (draft)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-zinc-700">
              Note <span className="font-normal text-zinc-400">(optional, same for everyone)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal" />
            </label>
            {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <button
              type="button"
              disabled={pending || !campaignId}
              onClick={() =>
                start(async () => {
                  const r = await inviteMany(creatorIds, campaignId, message);
                  setState(r);
                  if (r?.success) router.refresh();
                })
              }
              className="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-brand-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? 'Sending…' : `Send ${n} invites`}
            </button>
          </div>
        )}
      </Dialog>
    </>
  );
}
