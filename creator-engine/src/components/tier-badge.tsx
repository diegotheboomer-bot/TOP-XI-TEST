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

// Majesty: deep emerald body, molten-gold crown and a shimmering green-and-gold rim.
export const MAJESTY_RIM = 'linear-gradient(115deg, #fde68a, #34d399, #a3e635, #10b981, #fcd34d, #6ee7b7, #fde68a)';
const HOLO = MAJESTY_RIM;
const GOLD_TEXT = 'linear-gradient(180deg, #fff7cc 0%, #fcd34d 45%, #d97706 100%)';

const gradient = (stops: string[], angle = 135) => `linear-gradient(${angle}deg, ${stops.map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(', ')})`;

/** A small shiny pill: metal gradient, bevel highlight, soft glow and a light sweep. Majesty gets its own treatment. */
/** "Trusted" mark businesses see on a clipper: Platinum or higher, no fraud flags in 90 days. */
export function TrustedBadge({ className }: { className?: string }) {
  return (
    <span
      title="Trusted clipper: Platinum or higher, no fraud flags in the last 90 days"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 ring-1 ring-inset ring-sky-400/30 ${className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-3" aria-hidden>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      Trusted
    </span>
  );
}

export function TierBadge({ tier, size = 'sm', className, iconOnly, founder }: { tier: Tier; size?: 'sm' | 'lg'; className?: string; iconOnly?: boolean; /** Founder number (1–100): the emerald founder hexagon. */ founder?: number | null }) {
  if (iconOnly) return founder ? <FounderEmblem tier={tier} size={20} number={founder} className={className} /> : <TierDot tier={tier} className={className} />;
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[10px] [&_svg]:size-3' : 'px-3.5 py-1.5 text-sm [&_svg]:size-4';
  if (tier === 'majesty') {
    return (
      <span className={cn('majesty-ring relative inline-flex shrink-0 rounded-full p-[1.5px]', className)} style={{ backgroundImage: HOLO, backgroundSize: '300% 100%' }}>
        <span
          className={cn('tier-shine relative inline-flex items-center gap-1 overflow-hidden rounded-full font-extrabold tracking-tight', sizing)}
          style={{ background: 'radial-gradient(120% 140% at 50% 0%, #065f46 0%, #022c22 60%, #01140f 100%)', boxShadow: '0 0 14px -2px rgba(16,185,129,0.75), inset 0 1px 0 rgba(255,255,255,0.18)' }}
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
export function TierEmblem({ tier, size = 72, icon, founder }: { tier: Tier; size?: number; /** Swap the symbol (design previews). */ icon?: React.ElementType; founder?: number | null }) {
  if (founder) return <FounderEmblem tier={tier} size={size} number={founder} />;
  if (tier === 'majesty') return <MajestyEmblem size={size} icon={icon} />;
  const m = { ...METAL[tier], icon: icon ?? METAL[tier].icon };
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
function MajestyEmblem({ size, icon: Icon = Crown }: { size: number; icon?: React.ElementType }) {
  return (
    <span className="tier-float relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {/* Halo */}
      <span
        className="majesty-halo pointer-events-none absolute -inset-[18%] rounded-full opacity-80 blur-md"
        style={{ background: 'conic-gradient(from 0deg, #fde68a, #34d399, #a3e635, #10b981, #fcd34d, #6ee7b7, #fde68a)' }}
      />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id="maj-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="30%" stopColor="#34d399" />
            <stop offset="55%" stopColor="#fcd34d" />
            <stop offset="80%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <radialGradient id="maj-body" cx="50%" cy="25%" r="80%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="55%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#01110c" />
          </radialGradient>
          <linearGradient id="maj-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={hex(48)} fill="url(#maj-rim)" />
        <polygon points={hex(44)} fill="#01110c" />
        <polygon points={hex(42)} fill="url(#maj-body)" />
        <polygon points={hex(30)} fill="none" stroke="url(#maj-rim)" strokeWidth="1" opacity="0.7" />
        <polygon points={hex(42)} fill="url(#maj-gloss)" />
      </svg>
      <Icon
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

/** A tiny round tier mark (icon only), e.g. on an avatar corner. */
function TierDot({ tier, className }: { tier: Tier; className?: string }) {
  const royal = tier === 'majesty';
  const Icon = royal ? Crown : METAL[tier].icon;
  return (
    <span
      title={TIER_LABEL[tier]}
      className={cn('grid size-[18px] place-items-center rounded-full ring-2 ring-white', className)}
      style={
        royal
          ? { background: 'radial-gradient(circle at 50% 30%, #065f46, #022c22)', color: '#fcd34d', boxShadow: '0 0 8px -1px rgba(16,185,129,0.8)' }
          : { backgroundImage: gradient(METAL[tier].stops), color: METAL[tier].fg, boxShadow: `0 1px 4px ${METAL[tier].glow}` }
      }
    >
      <Icon className="size-2.5" strokeWidth={2.8} />
    </span>
  );
}

const TIER_ICON: Record<Tier, [React.ElementType, string]> = {
  silver: [Shield, '#e4e4e7'],
  gold: [Star, '#fcd34d'],
  platinum: [Medal, '#5eead4'],
  diamond: [Gem, '#67e8f9'],
  majesty: [Crown, '#fcd34d'],
};
const EMERALD = ['#022c22', '#047857', '#34d399', '#d1fae5', '#10b981', '#065f46', '#022c22'];

/**
 * Founding clipper (first 100): the clipper's own tier icon on dark emerald glass,
 * with a light that travels around the rim. Hover shows the founder number.
 */
export function FounderEmblem({ tier, size = 72, number, className }: { tier: Tier; size?: number; number?: number; className?: string }) {
  const [Icon, color] = TIER_ICON[tier];
  const id = `founder-${tier}-${size}`;
  return (
    <span
      title={number ? `Founder #${String(number).padStart(3, '0')} · ${TIER_LABEL[tier]}` : `Founder · ${TIER_LABEL[tier]}`}
      // Callers that pin it to a corner pass `absolute`; otherwise it sits in the flow.
      className={cn(className?.includes('absolute') ? '' : 'relative', 'inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size, filter: `drop-shadow(0 ${size > 30 ? 6 : 2}px ${size > 30 ? 14 : 5}px rgba(16,185,129,0.45))` }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
            {EMERALD.map((c, i) => (
              <stop key={i} offset={`${(i / (EMERALD.length - 1)) * 100}%`} stopColor={c} />
            ))}
            <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="5s" repeatCount="indefinite" />
          </linearGradient>
          <radialGradient id={`${id}-face`} cx="50%" cy="15%" r="90%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="55%" stopColor="#03241c" />
            <stop offset="100%" stopColor="#010f0b" />
          </radialGradient>
          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={hex(48)} fill={`url(#${id}-rim)`} />
        <polygon points={hex(40)} fill={`url(#${id}-face)`} />
        <polygon points={hex(40)} fill={`url(#${id}-gloss)`} />
      </svg>
      <Icon className="relative" style={{ width: size * 0.4, height: size * 0.4, color, filter: `drop-shadow(0 0 ${size > 30 ? 6 : 3}px ${color})` }} strokeWidth={2.4} />
    </span>
  );
}
