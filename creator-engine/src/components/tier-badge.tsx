import { Crown, Gem, Medal, Shield, Star } from 'lucide-react';
import { TIER_LABEL, type Tier } from '@/lib/tiers';
import { cn } from './ui/cn';

// Metallic finishes, fixed so a tier reads the same in light and dark themes.
// Each has: the metal (several stops for a polished look), its dark edge, its text colour and a glow.
const METAL: Record<Exclude<Tier, 'majesty'>, { stops: string[]; edge: string; fg: string; glow: string; icon: React.ElementType }> = {
  silver: { stops: ['#ffffff', '#d4d4d8', '#a1a1aa', '#e4e4e7', '#71717a'], edge: '#52525b', fg: '#18181b', glow: 'rgba(212,212,216,0.45)', icon: Shield },
  gold: { stops: ['#fff7cc', '#fcd34d', '#d97706', '#fde68a', '#b45309'], edge: '#78350f', fg: '#3b1d02', glow: 'rgba(245,158,11,0.55)', icon: Star },
  platinum: { stops: ['#f0fdfa', '#a7f3d0', '#5eead4', '#e0f2fe', '#2dd4bf'], edge: '#0f766e', fg: '#042f2e', glow: 'rgba(45,212,191,0.5)', icon: Medal },
  diamond: { stops: ['#ecfeff', '#67e8f9', '#3b82f6', '#a5f3fc', '#1d4ed8'], edge: '#1e3a8a', fg: '#06142e', glow: 'rgba(56,189,248,0.6)', icon: Gem },
};

// Majesty: obsidian body, molten-gold crown and a holographic rim that keeps moving.
const HOLO = 'linear-gradient(115deg, #fde68a, #f472b6, #a78bfa, #67e8f9, #a3e635, #fde68a)';
const GOLD_TEXT = 'linear-gradient(180deg, #fff7cc 0%, #fcd34d 45%, #d97706 100%)';

const gradient = (stops: string[], angle = 135) => `linear-gradient(${angle}deg, ${stops.map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(', ')})`;

/** A small shiny pill: metal gradient, bevel highlight, soft glow and a light sweep. Majesty gets its own treatment. */
export function TierBadge({ tier, size = 'sm', className }: { tier: Tier; size?: 'sm' | 'lg'; className?: string }) {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[10px] [&_svg]:size-3' : 'px-3.5 py-1.5 text-sm [&_svg]:size-4';
  if (tier === 'majesty') {
    return (
      <span className={cn('majesty-ring relative inline-flex shrink-0 rounded-full p-[1.5px]', className)} style={{ backgroundImage: HOLO, backgroundSize: '300% 100%' }}>
        <span
          className={cn('tier-shine relative inline-flex items-center gap-1 overflow-hidden rounded-full font-extrabold tracking-tight', sizing)}
          style={{ background: 'radial-gradient(120% 140% at 50% 0%, #2e1065 0%, #0b0613 70%)', boxShadow: '0 0 14px -2px rgba(167,139,250,0.7), inset 0 1px 0 rgba(255,255,255,0.18)' }}
        >
          <Crown strokeWidth={2.6} className="relative" style={{ color: '#fcd34d', filter: 'drop-shadow(0 0 4px rgba(252,211,77,0.8))' }} />
          <span className="relative bg-clip-text text-transparent" style={{ backgroundImage: GOLD_TEXT }}>
            {TIER_LABEL[tier]}
          </span>
        </span>
      </span>
    );
  }
  const m = METAL[tier];
  return (
    <span
      className={cn('tier-shine relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full font-bold tracking-tight', sizing, className)}
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

const hex = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(' ');

/** A big faceted emblem for profiles: a bevelled hexagon in the tier's metal with a glowing icon. */
export function TierEmblem({ tier, size = 72 }: { tier: Tier; size?: number }) {
  if (tier === 'majesty') return <MajestyEmblem size={size} />;
  const m = METAL[tier];
  const id = `tier-${tier}`;
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
        <polygon points={hex(48)} fill={m.edge} />
        <polygon points={hex(45)} fill={`url(#${id}-metal)`} />
        <polygon points={hex(35)} fill={`url(#${id}-face)`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
        <polygon points={hex(35)} fill={`url(#${id}-gloss)`} />
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
      <span className="tier-sparkle pointer-events-none absolute right-[14%] top-[10%] size-2 rounded-full" style={{ backgroundColor: '#fff' }} />
    </span>
  );
}

/** Majesty: an obsidian gem with a turning holographic halo, a molten-gold crown and orbiting sparks. */
function MajestyEmblem({ size }: { size: number }) {
  return (
    <span className="tier-float relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {/* Halo */}
      <span
        className="majesty-halo pointer-events-none absolute -inset-[18%] rounded-full opacity-80 blur-md"
        style={{ background: 'conic-gradient(from 0deg, #fde68a, #f472b6, #a78bfa, #67e8f9, #a3e635, #fde68a)' }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="maj-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="25%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="75%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <radialGradient id="maj-body" cx="50%" cy="25%" r="80%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="55%" stopColor="#1e0b3a" />
            <stop offset="100%" stopColor="#07030d" />
          </radialGradient>
          <linearGradient id="maj-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={hex(48)} fill="url(#maj-rim)" />
        <polygon points={hex(44)} fill="#07030d" />
        <polygon points={hex(42)} fill="url(#maj-body)" />
        <polygon points={hex(30)} fill="none" stroke="url(#maj-rim)" strokeWidth="1" opacity="0.7" />
        <polygon points={hex(42)} fill="url(#maj-gloss)" />
      </svg>
      <Crown
        className="relative"
        style={{ width: size * 0.4, height: size * 0.4, color: '#fcd34d', filter: 'drop-shadow(0 0 6px rgba(252,211,77,0.9)) drop-shadow(0 2px 0 #92400e)' }}
        strokeWidth={2.4}
      />
      <span className="majesty-orbit pointer-events-none absolute inset-0">
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full" style={{ backgroundColor: '#fff', boxShadow: '0 0 8px 2px #fde68a' }} />
      </span>
      <span className="tier-sparkle pointer-events-none absolute right-[12%] top-[12%] size-2 rounded-full" style={{ backgroundColor: '#fff' }} />
      <span className="tier-sparkle pointer-events-none absolute bottom-[16%] left-[10%] size-1.5 rounded-full" style={{ backgroundColor: '#fff', animationDelay: '1.2s' }} />
    </span>
  );
}
