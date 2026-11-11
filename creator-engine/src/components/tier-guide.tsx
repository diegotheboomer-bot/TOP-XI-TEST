'use client';

import { useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { TIERS, TIER_PERKS, TIER_RULES, compactViews, holdLabel, tierRank, tierFor, type ClipperRecord } from '@/lib/tiers';
import { Dialog } from './ui/dialog';
import { TierBadge } from './tier-badge';
import { cn } from './ui/cn';

/** "All tiers" button: a popup with every tier's requirements and perks. */
export function TierGuideButton({ record }: { record?: ClipperRecord }) {
  const [open, setOpen] = useState(false);
  const mine = record ? tierFor(record) : null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900">
        <Layers className="size-4" /> All tiers and perks
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Clipper tiers" description="Tiers go up automatically as your record grows. Higher tiers keep more of each payout and get paid sooner.">
        <ul className="space-y-3">
          {TIERS.map((t) => {
            const rule = TIER_RULES[t];
            const perks = TIER_PERKS[t];
            const on = t === mine;
            const reached = mine ? tierRank(t) <= tierRank(mine) : false;
            return (
              <li key={t} className={cn('rounded-xl border p-4', on ? 'border-brand-b/60 bg-brand-a/10' : 'border-zinc-200')}>
                <div className="flex items-center justify-between gap-3">
                  <TierBadge tier={t} size="lg" />
                  {on ? (
                    <span className="text-xs font-semibold text-[rgb(var(--brand-ta))]">You’re here</span>
                  ) : reached ? (
                    <Check className="size-4 text-zinc-400" />
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">To reach</p>
                    {t === 'silver' ? (
                      <p className="mt-1 text-zinc-600">Everyone starts here.</p>
                    ) : (
                      <ul className="mt-1 space-y-0.5 text-zinc-600">
                        <li>{compactViews(rule.views)} verified views</li>
                        <li>{rule.approved} approved clips</li>
                        <li>{Math.round(rule.approvalRate * 100)}% approval rate</li>
                        {rule.noFraud && <li>No fraud flags in 90 days</li>}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Perks</p>
                    <ul className="mt-1 space-y-0.5 text-zinc-600">
                      <li>{perks.feePct}% payout fee</li>
                      <li>Paid {holdLabel(perks.holdHours)} after approval</li>
                      <li>{perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`}</li>
                      {t !== 'silver' && <li>{`${t[0].toUpperCase()}${t.slice(1)}-only campaigns, reviewed first`}</li>}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}
