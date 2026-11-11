'use client';

import { useState } from 'react';
import { BadgePercent, Check, Crown, CircleCheck, Eye, Layers, ShieldCheck, Sparkles, Target, Wallet, Zap } from 'lucide-react';
import { TIERS, TIER_LABEL, TIER_PERKS, TIER_RULES, approvalRate, compactViews, holdLabel, tierRank, tierFor, type ClipperRecord, type Tier } from '@/lib/tiers';
import { Dialog } from './ui/dialog';
import { MAJESTY_RIM } from './tier-badge';
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
              <li
                key={t}
                className={cn(t === 'majesty' ? 'majesty-ring relative rounded-2xl p-[1.5px]' : 'relative overflow-hidden rounded-2xl border p-4', on && t !== 'majesty' && 'ring-2 ring-offset-2 ring-offset-transparent')}
                style={
                  t === 'majesty'
                    ? { backgroundImage: MAJESTY_RIM, backgroundSize: '300% 100%' }
                    : { backgroundImage: THEME[t].bg, borderColor: THEME[t].border, ...(on ? ({ '--tw-ring-color': THEME[t].border } as React.CSSProperties) : {}) }
                }
              >
                <div className={cn('[&>div]:relative', t === 'majesty' && 'majesty-box relative overflow-hidden rounded-[15px] p-4')}>
                {t === 'majesty' ? <MajestyDecor /> : <TierGlow t={t} />}
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <TierBadge tier={t} size="lg" />
                    {t === 'majesty' && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundImage: 'linear-gradient(135deg, #fff7cc, #fcd34d 45%, #d97706)', color: '#422006', boxShadow: '0 0 10px -2px rgba(252,211,77,0.8)' }}
                      >
                        Highest tier
                      </span>
                    )}
                  </span>
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
                        <Row royal={t === 'majesty'} icon={Eye} text={`${compactViews(rule.views)} verified views`} met={record ? record.views >= rule.views : undefined} />
                        <Row royal={t === 'majesty'} icon={CircleCheck} text={`${rule.approved} approved clips`} met={record ? record.approved >= rule.approved : undefined} />
                        <Row royal={t === 'majesty'} icon={Target} text={`${Math.round(rule.approvalRate * 100)}% approval rate`} met={record ? approvalRate(record) >= rule.approvalRate : undefined} />
                        {rule.noFraud && <Row royal={t === 'majesty'} icon={ShieldCheck} text="No fraud flags in 90 days" met={record ? record.recentFraud === 0 : undefined} />}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Perks</p>
                    <ul className="space-y-1.5">
                      <Perk royal={t === 'majesty'} tint={t === 'majesty' ? undefined : THEME[t].tile} icon={BadgePercent} text={`${perks.feePct}% payout fee`} />
                      <Perk royal={t === 'majesty'} tint={t === 'majesty' ? undefined : THEME[t].tile} icon={Zap} text={`Paid ${holdLabel(perks.holdHours)} after approval`} />
                      <Perk royal={t === 'majesty'} tint={t === 'majesty' ? undefined : THEME[t].tile} icon={Wallet} text={perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`} />
                      {t !== 'silver' && <Perk royal={t === 'majesty'} tint={t === 'majesty' ? undefined : THEME[t].tile} icon={Sparkles} text={`${TIER_LABEL[t]}-only campaigns, reviewed first`} />}
                    </ul>
                  </div>
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
function Row({ icon: Icon, text, met, royal }: { icon: React.ElementType; text: string; met?: boolean; royal?: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className={cn('grid size-7 shrink-0 place-items-center rounded-full', !royal && (met ? 'bg-brand-a/15 text-[rgb(var(--brand-ta))] ring-1 ring-inset ring-brand-a/40' : 'bg-zinc-100 text-zinc-500'))}
        style={royal ? { backgroundColor: met ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)', color: met ? '#6ee7b7' : '#a7f3d0', boxShadow: met ? 'inset 0 0 0 1px rgba(52,211,153,0.5)' : undefined } : undefined}
      >
        {met ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
      </span>
      <span className={cn(!royal && (met ? 'text-zinc-900' : 'text-zinc-600'))} style={royal ? { color: '#ecfdf5' } : undefined}>
        {text}
      </span>
    </li>
  );
}

/** A perk: a volt icon tile and its text. */
function Perk({ icon: Icon, text, royal, tint }: { icon: React.ElementType; text: string; royal?: boolean; tint?: { bg: string; fg: string } }) {
  return (
    <li className={cn('flex items-center gap-2.5 text-sm', !royal && 'text-zinc-700')} style={royal ? { color: '#ecfdf5', fontWeight: 500 } : undefined}>
      <span
        className={cn('platform-tile relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg', !royal && !tint && 'bg-brand text-brand-ink')}
        style={
          royal
            ? { backgroundImage: 'linear-gradient(135deg, #fff7cc, #fcd34d 45%, #d97706)', color: '#422006', boxShadow: '0 0 12px -2px rgba(252,211,77,0.7)' }
            : tint
              ? { backgroundImage: tint.bg, color: tint.fg }
              : undefined
        }
      >
        <Icon className="relative size-3.5" />
      </span>
      {text}
    </li>
  );
}

/** Majesty's box: a deep emerald glow, a faint crown watermark, drifting sparkles and a "highest tier" tag. */
function MajestyDecor() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 70% at 85% 0%, rgba(52,211,153,0.35), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(252,211,77,0.18), transparent 60%), linear-gradient(160deg, #064e3b, #022c22 55%, #01140f)' }}
      />
      <Crown className="pointer-events-none absolute -right-4 -top-3 size-28 rotate-12" style={{ color: 'rgba(252,211,77,0.09)' }} strokeWidth={1.5} />
      {[
        ['12%', '72%', '0s'],
        ['48%', '88%', '0.8s'],
        ['78%', '58%', '1.6s'],
        ['30%', '40%', '2.2s'],
      ].map(([l, t, d]) => (
        <span key={l + t} className="tier-sparkle pointer-events-none absolute size-1.5 rounded-full" style={{ left: l, top: t, backgroundColor: '#fff', animationDelay: d }} />
      ))}

    </>
  );
}

// Each tier's box: a soft tint of its metal, a matching border and perk tiles in its colours.
// Calmer than Majesty on purpose: no moving rim, no sparkles.
const THEME: Record<Exclude<Tier, 'majesty'>, { bg: string; border: string; glow: string; tile: { bg: string; fg: string } }> = {
  silver: {
    bg: 'linear-gradient(160deg, rgba(212,212,216,0.16), rgba(161,161,170,0.04) 60%)',
    border: 'rgba(161,161,170,0.45)',
    glow: 'rgba(228,228,231,0.25)',
    tile: { bg: 'linear-gradient(135deg, #ffffff, #d4d4d8 50%, #a1a1aa)', fg: '#18181b' },
  },
  gold: {
    bg: 'linear-gradient(160deg, rgba(252,211,77,0.18), rgba(217,119,6,0.04) 60%)',
    border: 'rgba(245,158,11,0.5)',
    glow: 'rgba(252,211,77,0.3)',
    tile: { bg: 'linear-gradient(135deg, #fff7cc, #fcd34d 50%, #d97706)', fg: '#3b1d02' },
  },
  platinum: {
    bg: 'linear-gradient(160deg, rgba(94,234,212,0.18), rgba(45,212,191,0.04) 60%)',
    border: 'rgba(45,212,191,0.5)',
    glow: 'rgba(94,234,212,0.3)',
    tile: { bg: 'linear-gradient(135deg, #f0fdfa, #a7f3d0 50%, #2dd4bf)', fg: '#042f2e' },
  },
  diamond: {
    bg: 'linear-gradient(160deg, rgba(103,232,249,0.18), rgba(59,130,246,0.05) 60%)',
    border: 'rgba(59,130,246,0.5)',
    glow: 'rgba(103,232,249,0.3)',
    tile: { bg: 'linear-gradient(135deg, #ecfeff, #67e8f9 50%, #3b82f6)', fg: '#06142e' },
  },
};

/** A soft glow in the tier's colour in the box's top corner. */
function TierGlow({ t }: { t: Exclude<Tier, 'majesty'> }) {
  return <span className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full blur-2xl" style={{ backgroundColor: THEME[t].glow }} />;
}
