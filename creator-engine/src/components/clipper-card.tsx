import { TierEmblem } from './tier-badge';
import { TIER_LABEL, type Tier } from '@/lib/tiers';
import { compact } from '@/lib/format';

// Card colours per tier (fixed hex so it reads the same in light and dark themes).
const THEME: Record<Tier, { border: string; glow: string; bg: string; accent: string }> = {
  silver: { border: 'linear-gradient(135deg, #f4f4f5, #71717a, #e4e4e7)', glow: '#a1a1aa', bg: 'radial-gradient(120% 80% at 50% 0%, #2a2a2e, #141416 60%, #0b0b0c)', accent: '#e4e4e7' },
  gold: { border: 'linear-gradient(135deg, #fde68a, #b45309, #fcd34d)', glow: '#f59e0b', bg: 'radial-gradient(120% 80% at 50% 0%, #3a2a0c, #17120a 60%, #0c0a06)', accent: '#fcd34d' },
  platinum: { border: 'linear-gradient(135deg, #ccfbf1, #0f766e, #5eead4)', glow: '#2dd4bf', bg: 'radial-gradient(120% 80% at 50% 0%, #0d3330, #0b1716 60%, #070c0c)', accent: '#5eead4' },
  diamond: { border: 'linear-gradient(135deg, #cffafe, #1d4ed8, #67e8f9)', glow: '#38bdf8', bg: 'radial-gradient(120% 80% at 50% 0%, #0c2a44, #0a1420 60%, #060a10)', accent: '#67e8f9' },
  majesty: { border: 'linear-gradient(135deg, #fde68a, #10b981, #fcd34d)', glow: '#10b981', bg: 'radial-gradient(120% 80% at 50% 0%, #064e3b, #03241c 55%, #010f0b)', accent: '#fcd34d' },
};

/**
 * Every clipper's card: name, tier emblem and stats. The first 100 clippers get the
 * founder edition: flowing emerald border, sheen and their founder number.
 */
export function ClipperCard({
  name,
  tier,
  founder,
  views,
  clips,
  joinedAt,
  progress,
  progressClassName,
}: {
  name: string;
  tier: Tier;
  founder: number | null;
  views: number;
  clips: number;
  joinedAt: string | null;
  /** Progress to the next tier, shown inside the card (e.g. on phones). */
  progress?: { next: Tier | null; pct: number };
  progressClassName?: string;
}) {
  const t = THEME[tier];
  const since = joinedAt ? new Date(joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
  const accent = founder ? '#6ee7b7' : t.accent;
  return (
    <div className={founder ? 'emerald-flow flex h-full rounded-3xl p-[1.5px]' : 'flex h-full rounded-3xl p-[1.5px]'} style={founder ? undefined : { backgroundImage: t.border }}>
      <div
        className="card-sheen flex w-full flex-col justify-between rounded-[22px] p-4 sm:p-6"
        style={{ background: founder ? 'radial-gradient(120% 80% at 50% 0%, #064e3b 0%, #03241c 45%, #010f0b 100%)' : t.bg, color: '#fff', boxShadow: `0 20px 50px -25px ${founder ? '#10b981' : t.glow}` }}
      >
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Atlas Clipping
          </p>
          {founder ? (
            <p className="font-mono text-sm font-bold" style={{ color: '#6ee7b7' }}>
              #{String(founder).padStart(3, '0')}
              <span style={{ color: 'rgba(209,250,229,0.35)' }}>/100</span>
            </p>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
              {TIER_LABEL[tier]}
            </p>
          )}
        </div>
        {/* Phones: badge beside the name to save height; bigger screens: centred. */}
        <div className="mt-4 flex items-center gap-4 md:mt-6 md:flex-col md:gap-0 md:text-center">
          <span className="md:hidden">
            <TierEmblem tier={tier} size={64} founder={founder} />
          </span>
          <span className="hidden md:block">
            <TierEmblem tier={tier} size={96} founder={founder} />
          </span>
          <div className="min-w-0">
          <p className="max-w-full truncate text-xl font-semibold tracking-tight md:mt-4 md:text-2xl">{name}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: accent }}>
            {founder ? 'Founding clipper' : 'Clipper'}
          </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center md:mt-6">
          {[
            [compact(views), 'views'],
            [String(clips), 'clips'],
            [TIER_LABEL[tier], 'tier'],
          ].map(([v, k]) => (
            <div key={k} className="rounded-xl py-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-sm font-semibold">{v}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {k}
              </p>
            </div>
          ))}
        </div>
        {progress && (
          <div className={progressClassName ?? 'mt-5'}>
            <div className="flex justify-between text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span>{TIER_LABEL[tier]}</span>
              <span>{progress.next ? `${Math.round(progress.pct * 100)}% to ${TIER_LABEL[progress.next]}` : 'Top tier'}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round((progress.next ? progress.pct : 1) * 100)}%`, background: `linear-gradient(90deg, ${accent}, ${founder ? '#10b981' : t.glow})` }} />
            </div>
          </div>
        )}
        {(founder || since) && (
          <p className="mt-3 text-center text-[11px] md:mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {founder ? 'One of the first 100' : 'Clipping'}
            {since ? ` · since ${since}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
