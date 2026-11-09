'use client';

import { useState } from 'react';
import type { ActionState } from '@/actions/result';
import { usdCents } from '@/lib/format';
import { FormMessage } from './form-message';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';

export interface CancelSummary {
  /** Unspent budget that goes back to the streamer's card. */
  refund: number;
  /** Earned by approved clips but not paid yet; stays reserved for clippers. */
  reserved: number;
  /** Platform fees paid so far; not refundable. */
  fees: number;
  feePercent: number;
  /** Clips still waiting for review. */
  pending: number;
}

/**
 * "Cancel campaign" with a confirmation popup that spells out the refund.
 * On an ended campaign (`ended`) it offers to refund budget freed up since,
 * and renders nothing when there's none.
 */
export function CancelCampaign({ summary, ended: endedNow, onConfirm }: { summary: CancelSummary; ended: boolean; onConfirm: () => Promise<ActionState> | ActionState }) {
  const [open, setOpen] = useState(false);
  // The page re-renders as ended once cancelling succeeds; keep the wording of the step that was opened.
  const [ended, setEnded] = useState(endedNow);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionState>();
  const { refund, reserved, fees, feePercent, pending } = summary;

  async function confirm() {
    setBusy(true);
    setResult(await onConfirm());
    setBusy(false);
  }

  const showTrigger = !endedNow || refund > 0;
  const done = !!result?.success;
  return (
    <>
      {showTrigger && (
        <Button
          size="sm"
          variant={endedNow ? 'secondary' : 'danger'}
          onClick={() => {
            setResult(undefined);
            setEnded(endedNow);
            setOpen(true);
          }}
        >
          {endedNow ? `Refund ${usdCents(refund)}` : 'Cancel campaign'}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={done ? (ended ? 'Refund started' : 'Campaign cancelled') : ended ? 'Refund unspent budget?' : 'Cancel this campaign?'}
        description={done ? undefined : ended ? 'This budget was freed up after the campaign ended.' : 'Clippers can’t join or post new clips, and views stop earning.'}
      >
        {done ? (
          <div className="space-y-5">
            <FormMessage state={result} />
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl bg-zinc-50 px-4 py-3.5 text-sm">
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Refund to your card</dt>
                <dd className="tabular-nums">{usdCents(refund)}</dd>
              </div>
              {reserved > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Kept for clippers’ earnings</dt>
                  <dd className="tabular-nums">{usdCents(reserved)}</dd>
                </div>
              )}
              {fees > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Platform fee ({feePercent}%), not refunded</dt>
                  <dd className="tabular-nums">{usdCents(fees)}</dd>
                </div>
              )}
            </dl>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-zinc-500">
              <li>Refunds go back to the card you paid with and usually show up in 5–10 business days.</li>
              {reserved > 0 && <li>Clippers keep what approved clips have already earned. Pay them from the clips table.</li>}
              {!ended && pending > 0 && (
                <li className="text-amber-700">
                  {pending} {pending === 1 ? 'clip is' : 'clips are'} still waiting for review and won’t earn. Approve {pending === 1 ? 'it' : 'them'} first if you want to pay {pending === 1 ? 'it' : 'them'}.
                </li>
              )}
              {!ended && <li>This can’t be undone.</li>}
            </ul>
            <FormMessage state={result} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {ended ? 'Not now' : 'Keep campaign'}
              </Button>
              <Button variant={ended ? 'primary' : 'danger'} onClick={confirm} disabled={busy}>
                {busy ? 'Working…' : ended ? `Refund ${usdCents(refund)}` : refund > 0 ? `Cancel and refund ${usdCents(refund)}` : 'Cancel campaign'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
