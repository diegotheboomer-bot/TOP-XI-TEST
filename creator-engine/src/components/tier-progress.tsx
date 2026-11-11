import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { TIERS, TIER_LABEL, TIER_PERKS, holdLabel, tierProgress, tierRank, type ClipperRecord } from '@/lib/tiers';
import { TierBadge, TierEmblem } from './tier-badge';
import { cn } from './ui/cn';

// Bar colours per tier (fixed, theme-independent) so the track matches the badges.
const TRACK: Record<string, string> = {
  silver: 'linear-gradient(90deg, #e4e4e7, #a1a1aa)',
  gold: 'linear-gradient(90deg, #fde68a, #f59e0b)',
  diamond: 'linear-gradient(90deg, #a5f3fc, #3b82f6)',
  majesty: 'linear-gradient(90deg, #a3e635, #22c55e, #a855f7)',
};

/** The tier ladder: four stops, filled up to the clipper's tier plus their progress toward the next. */
export function TierLadder({ record }: { record: ClipperRecord }) {
  const { tier, next, pct } = tierProgress(record);
  const rank = tierRank(tier);
  return (
    <div>
      <div className="relative mx-3 h-2.5 rounded-full bg-zinc-100">
        {/* One segment per step up, each in the colour of the tier it leads to. */}
        {TIERS.slice(1).map((t, i) => {
          const done = i < rank ? 1 : i === rank && next ? pct : 0;
          const w = 100 / (TIERS.length - 1);
          return (
            <div key={t} className="absolute inset-y-0 overflow-hidden" style={{ left: `${i * w}%`, width: `${w}%` }}>
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${done * 100}%`, backgroundImage: TRACK[t] }} />
            </div>
          );
        })}
        {TIERS.map((t, i) => {
          const reached = i <= rank;
          return (
            <span
              key={t}
              className={cn('absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-4 ring-white', reached ? '' : 'bg-zinc-200')}
              style={{ left: `${(i / (TIERS.length - 1)) * 100}%`, backgroundImage: reached ? TRACK[t] : undefined }}
            />
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-4 text-center text-[11px]">
        {TIERS.map((t, i) => (
          <span key={t} className={cn(i === 0 ? 'text-left' : i === TIERS.length - 1 ? 'text-right' : '', i <= rank ? 'font-semibold text-zinc-900' : 'text-zinc-400')}>
            {TIER_LABEL[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Compact "your tier" card for the clipper home: emblem, progress and the next unlock. */
export function TierCard({ record, href = '/clipper/profile' }: { record: ClipperRecord; href?: string }) {
  const { tier, next, pct } = tierProgress(record);
  const perks = TIER_PERKS[next ?? tier];
  return (
    <Link href={href} className="group block rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card transition hover:border-zinc-300 sm:p-6">
      <div className="flex items-center gap-4">
        <TierEmblem tier={tier} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-zinc-500">Your tier</p>
            <TierBadge tier={tier} />
          </div>
          <p className="mt-0.5 font-semibold tracking-tight">
            {next ? (
              <>
                {Math.round(pct * 100)}% of the way to {TIER_LABEL[next]}
              </>
            ) : (
              'Top tier reached'
            )}
          </p>
          {next && (
            <p className="text-xs text-zinc-500">
              Unlocks {perks.feePct}% fee · paid {holdLabel(perks.holdHours)} after approval
            </p>
          )}
        </div>
        <ChevronRight className="size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900" />
      </div>
      <div className="mt-5">
        <TierLadder record={record} />
      </div>
    </Link>
  );
}
