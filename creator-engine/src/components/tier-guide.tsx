'use client';

import { useState } from 'react';
import { BadgePercent, Check, CircleCheck, Eye, Layers, ShieldCheck, Sparkles, Target, Wallet, Zap } from 'lucide-react';
import { TIERS, TIER_LABEL, TIER_PERKS, TIER_RULES, approvalRate, compactViews, holdLabel, tierRank, tierFor, type ClipperRecord } from '@/lib/tiers';
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
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">To reach</p>
                    {t === 'silver' ? (
                      <Row icon={Sparkles} text="Everyone starts here" met />
                    ) : (
                      <ul className="space-y-1.5">
                        <Row icon={Eye} text={`${compactViews(rule.views)} verified views`} met={record ? record.views >= rule.views : undefined} />
                        <Row icon={CircleCheck} text={`${rule.approved} approved clips`} met={record ? record.approved >= rule.approved : undefined} />
                        <Row icon={Target} text={`${Math.round(rule.approvalRate * 100)}% approval rate`} met={record ? approvalRate(record) >= rule.approvalRate : undefined} />
                        {rule.noFraud && <Row icon={ShieldCheck} text="No fraud flags in 90 days" met={record ? record.recentFraud === 0 : undefined} />}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Perks</p>
                    <ul className="space-y-1.5">
                      <Perk icon={BadgePercent} text={`${perks.feePct}% payout fee`} />
                      <Perk icon={Zap} text={`Paid ${holdLabel(perks.holdHours)} after approval`} />
                      <Perk icon={Wallet} text={perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`} />
                      {t !== 'silver' && <Perk icon={Sparkles} text={`${TIER_LABEL[t]}-only campaigns, reviewed first`} />}
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

/** A requirement: icon, text, and a tick once the clipper meets it. */
function Row({ icon: Icon, text, met }: { icon: React.ElementType; text: string; met?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', met ? 'bg-brand-a/15 text-[rgb(var(--brand-ta))] ring-1 ring-inset ring-brand-a/40' : 'bg-zinc-100 text-zinc-500')}>
        {met ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
      </span>
      <span className={cn(met ? 'text-zinc-900' : 'text-zinc-600')}>{text}</span>
    </li>
  );
}

/** A perk: a volt icon tile and its text. */
function Perk({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-zinc-700">
      <span className="platform-tile relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand text-brand-ink">
        <Icon className="relative size-3.5" />
      </span>
      {text}
    </li>
  );
}
