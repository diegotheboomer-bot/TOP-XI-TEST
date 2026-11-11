'use client';

import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { inviteClipper } from '@/actions/brand';
import type { ActionState } from '@/actions/result';
import { Dialog } from './ui/dialog';

/** "Invite" on a scouted clipper: pick one of your live campaigns and add a note. */
export function InviteButton({ creatorId, name, campaigns }: { creatorId: string; name: string; campaigns: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState(undefined);
          setOpen(true);
        }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-brand-ink transition hover:brightness-110"
      >
        <Send className="size-3.5" /> Invite
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Invite ${name}`} description="They’ll see your invite on their home page and can join with one tap.">
        {campaigns.length === 0 ? (
          <p className="text-sm text-zinc-500">You need a live campaign to invite clippers to. Launch one first.</p>
        ) : state?.success ? (
          <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">{state.success}</p>
        ) : (
          <div className="space-y-4">
            <label className="block text-[13px] font-medium text-zinc-700">
              Campaign
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-normal">
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-zinc-700">
              Note <span className="font-normal text-zinc-400">(optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Loved your clips. Want to clip our new trailer?"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-normal"
              />
            </label>
            {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
            <button
              type="button"
              disabled={pending || !campaignId}
              onClick={() => start(async () => setState(await inviteClipper(creatorId, campaignId, message)))}
              className="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-brand-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        )}
      </Dialog>
    </>
  );
}
