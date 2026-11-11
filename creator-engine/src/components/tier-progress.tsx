import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { TIER_LABEL, TIER_PERKS, holdLabel, tierProgress, type ClipperRecord } from '@/lib/tiers';
import { TierBadge, TierEmblem } from './tier-badge';
import { TierGuideButton } from './tier-guide';

// Bar colour per tier (fixed, theme-independent) so the bar matches the badge it leads to.
const TRACK: Record<string, string> = {
  silver: 'linear-gradient(90deg, #e4e4e7, #a1a1aa)',
  gold: 'linear-gradient(90deg, #fde68a, #f59e0b)',
  diamond: 'linear-gradient(90deg, #a5f3fc, #3b82f6)',
  majesty: 'linear-gradient(90deg, #a3e635, #22c55e, #a855f7)',
};

/** One bar from the current tier to the next. */
export function NextTierBar({ record }: { record: ClipperRecord }) {
  const { tier, next, pct } = tierProgress(record);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <TierBadge tier={tier} />
        {next ? <TierBadge tier={next} /> : <span className="text-xs font-medium text-zinc-500">Top tier</span>}
      </div>
      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(next ? pct * 100 : 100, 3)}%`, backgroundImage: TRACK[next ?? tier] }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{next ? `${Math.round(pct * 100)}% of the way to ${TIER_LABEL[next]}` : 'You’ve reached Majesty, the highest tier.'}</p>
    </div>
  );
}

/** Compact "your tier" card for the clipper home. */
export function TierCard({ record }: { record: ClipperRecord }) {
  const { tier, next } = tierProgress(record);
  const unlock = next ? TIER_PERKS[next] : null;
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-4">
        <TierEmblem tier={tier} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-500">Your tier</p>
          <p className="font-semibold tracking-tight">{TIER_LABEL[tier]}</p>
          {unlock && next && (
            <p className="text-xs text-zinc-500">
              At {TIER_LABEL[next]}: {unlock.feePct}% fee, paid {holdLabel(unlock.holdHours)} after approval
            </p>
          )}
        </div>
        <Link href="/clipper/profile" aria-label="Your profile" className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900">
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="mt-5">
        <NextTierBar record={record} />
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-4">
        <TierGuideButton record={record} />
      </div>
    </div>
  );
}
