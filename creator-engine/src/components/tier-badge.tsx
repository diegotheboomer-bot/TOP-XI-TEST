import { Crown, Gem, Shield, Star } from 'lucide-react';
import { TIER_LABEL, type Tier } from '@/lib/tiers';
import { cn } from './ui/cn';

// Fixed colours so a tier reads the same in light and dark themes.
const STYLE: Record<Tier, { bg: string; fg: string; icon: React.ElementType }> = {
  silver: { bg: 'linear-gradient(135deg, #e4e4e7, #a1a1aa)', fg: '#18181b', icon: Shield },
  gold: { bg: 'linear-gradient(135deg, #fde68a, #f59e0b)', fg: '#422006', icon: Star },
  diamond: { bg: 'linear-gradient(135deg, #a5f3fc, #3b82f6)', fg: '#0c1a3a', icon: Gem },
  majesty: { bg: 'linear-gradient(135deg, #d9f99d, #22c55e 45%, #a855f7)', fg: '#14051f', icon: Crown },
};

export function TierBadge({ tier, size = 'sm', className }: { tier: Tier; size?: 'sm' | 'lg'; className?: string }) {
  const s = STYLE[tier];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-semibold shadow-sm',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] [&>svg]:size-3' : 'px-3 py-1 text-sm [&>svg]:size-4',
        className,
      )}
      style={{ backgroundImage: s.bg, color: s.fg }}
    >
      <s.icon strokeWidth={2.5} />
      {TIER_LABEL[tier]}
    </span>
  );
}

/** A big tier emblem for profile pages. */
export function TierEmblem({ tier }: { tier: Tier }) {
  const s = STYLE[tier];
  return (
    <span className="relative grid size-16 place-items-center overflow-hidden rounded-2xl shadow-lg" style={{ backgroundImage: s.bg, color: s.fg }}>
      <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
      <s.icon className="relative size-8" strokeWidth={2.2} />
    </span>
  );
}
