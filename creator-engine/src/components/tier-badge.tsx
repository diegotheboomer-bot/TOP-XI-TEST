import { Crown, Gem, Shield, Star } from 'lucide-react';
import { TIER_LABEL, type Tier } from '@/lib/tiers';
import { cn } from './ui/cn';

// Metallic finishes, fixed so a tier reads the same in light and dark themes.
// Each has: the metal (several stops for a polished look), its dark edge, its text colour and a glow.
const METAL: Record<Tier, { stops: string[]; edge: string; fg: string; glow: string; icon: React.ElementType }> = {
  silver: { stops: ['#ffffff', '#d4d4d8', '#a1a1aa', '#e4e4e7', '#71717a'], edge: '#52525b', fg: '#18181b', glow: 'rgba(212,212,216,0.45)', icon: Shield },
  gold: { stops: ['#fff7cc', '#fcd34d', '#d97706', '#fde68a', '#b45309'], edge: '#78350f', fg: '#3b1d02', glow: 'rgba(245,158,11,0.55)', icon: Star },
  diamond: { stops: ['#ecfeff', '#67e8f9', '#3b82f6', '#a5f3fc', '#1d4ed8'], edge: '#1e3a8a', fg: '#06142e', glow: 'rgba(56,189,248,0.6)', icon: Gem },
  majesty: { stops: ['#f7fee7', '#a3e635', '#22c55e', '#c084fc', '#7e22ce'], edge: '#3b0764', fg: '#12051c', glow: 'rgba(168,85,247,0.6)', icon: Crown },
};

const gradient = (stops: string[], angle = 135) => `linear-gradient(${angle}deg, ${stops.map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(', ')})`;

/** A small shiny pill: metal gradient, bevel highlight, soft glow and a light sweep. */
export function TierBadge({ tier, size = 'sm', className }: { tier: Tier; size?: 'sm' | 'lg'; className?: string }) {
  const m = METAL[tier];
  return (
    <span
      className={cn(
        'tier-shine relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full font-bold tracking-tight',
        size === 'sm' ? 'px-2 py-0.5 text-[10px] [&>svg]:size-3' : 'px-3.5 py-1.5 text-sm [&>svg]:size-4',
        className,
      )}
      style={{
        backgroundImage: gradient(m.stops),
        color: m.fg,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 0 1px ${m.edge}55, 0 3px 10px -2px ${m.glow}`,
        textShadow: '0 1px 0 rgba(255,255,255,0.45)',
      }}
    >
      <m.icon strokeWidth={2.6} className="relative drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]" />
      <span className="relative">{TIER_LABEL[tier]}</span>
    </span>
  );
}

/** A big faceted emblem for profiles: a bevelled hexagon in the tier's metal with a glowing icon. */
export function TierEmblem({ tier, size = 72 }: { tier: Tier; size?: number }) {
  const m = METAL[tier];
  const id = `tier-${tier}`;
  // Pointy-top hexagon and a smaller inner one for the bevel.
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
    }).join(' ');
  return (
    <span className="tier-float relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size, filter: `drop-shadow(0 8px 18px ${m.glow})` }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
            {m.stops.map((c, i) => (
              <stop key={i} offset={`${(i / (m.stops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            {m.stops
              .slice()
              .reverse()
              .map((c, i) => (
                <stop key={i} offset={`${(i / (m.stops.length - 1)) * 100}%`} stopColor={c} />
              ))}
          </linearGradient>
          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Outer rim, dark edge, inner face, gloss */}
        <polygon points={hex(48)} fill={m.edge} />
        <polygon points={hex(45)} fill={`url(#${id}-metal)`} />
        <polygon points={hex(35)} fill={`url(#${id}-face)`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
        <polygon points={hex(35)} fill={`url(#${id}-gloss)`} />
        {/* Facet lines from the inner corners to the rim */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          return (
            <line
              key={i}
              x1={50 + 35 * Math.cos(a)}
              y1={50 + 35 * Math.sin(a)}
              x2={50 + 45 * Math.cos(a)}
              y2={50 + 45 * Math.sin(a)}
              stroke={i < 3 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)'}
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <m.icon className="relative" style={{ width: size * 0.36, height: size * 0.36, color: m.fg, filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.6))' }} strokeWidth={2.4} />
      <span className="tier-sparkle pointer-events-none absolute right-[14%] top-[10%] size-2 rounded-full" style={{ backgroundColor: "#fff" }} />
    </span>
  );
}
