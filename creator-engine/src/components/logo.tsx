'use client';

// Logo: a sharp A (for Atlas) built from clean geometry: parallel legs of even
// thickness, cut or sliced with even gaps, in the Volt gradient on a dark tile.
// Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

/** Facet tones: a/b are the Volt stops, g the gradient, d a softer shade. */
type Tone = 'a' | 'b' | 'g' | 'd';
interface Piece {
  d: string;
  t: Tone;
  /** Clip polygon (points). With `move`, the clip moves too, so the piece slides as one. */
  clip?: string;
  move?: string;
}

const f = (v: number) => String(Math.round(v * 100) / 100);

/** An A with no crossbar: two legs of thickness `t` (measured across the base) meeting in a point. */
function a({ t = 5, top = 4, bottom = 24, w = 10.5, dx = 0 } = {}) {
  const s = w / (bottom - top);
  const cx = 14 + dx;
  const [lx, rx] = [cx - w, cx + w];
  const [ilx, irx] = [lx + t, rx - t];
  const iy = bottom - (cx - ilx) / s;
  const d = `M${f(lx)} ${f(bottom)} ${f(cx)} ${f(top)} ${f(rx)} ${f(bottom)} ${f(irx)} ${f(bottom)} ${f(cx)} ${f(iy)} ${f(ilx)} ${f(bottom)}z`;
  /** The crossbar between y1 and y2, tucked slightly into both legs. */
  const bar = (y1: number, y2: number) => {
    const xl = (y: number) => ilx + (bottom - y) * s - 0.3;
    const xr = (y: number) => 2 * cx - xl(y);
    return `M${f(xl(y2))} ${f(y2)} ${f(xr(y2))} ${f(y2)} ${f(xr(y1))} ${f(y1)} ${f(xl(y1))} ${f(y1)}z`;
  };
  return { d, bar };
}

/** The two sides of a straight cut of slope `k` through (x, y), leaving a gap of 2h. */
function cut(k: number, x: number, y: number, h = 0.8) {
  const c = y + k * x;
  return {
    high: `-5,-40 33,-40 33,${f(c - k * 33 - h)} -5,${f(c + k * 5 - h)}`,
    low: `-5,${f(c + k * 5 + h)} 33,${f(c - k * 33 + h)} 33,40 -5,40`,
  };
}
/** Slides a piece a distance `d` along a cut of slope `k`, keeping its edges parallel. */
const along = (k: number, d: number) => {
  const n = Math.hypot(1, k);
  return `translate(${f(d / n)} ${f((-d * k) / n)})`;
};

/** The classic cut: the A sliced at slope k through (x, y), the top piece slid along. */
function cutA(shape: ReturnType<typeof a>, k: number, x: number, y: number, top: Tone = 'g', extra: (side: 'low' | 'high') => Piece[] = () => []): Piece[] {
  const { high, low } = cut(k, x, y);
  const move = along(k, k < 0 ? -2 : 2);
  return [
    { d: shape.d, t: 'g', clip: low },
    ...extra('low').map((p) => ({ ...p, clip: low })),
    { d: shape.d, t: top, clip: high, move },
    ...extra('high').map((p) => ({ ...p, clip: high, move })),
  ];
}

const A = a({ dx: -0.9 });
const STEEP = a({ dx: -0.8 });

export const LOGO_MARKS = [
  { id: 'cut', name: 'Cut', meaning: 'The A sliced, top piece slid along the cut', pieces: cutA(A, 0.3, 13.1, 15.2) },
  {
    id: 'cutbar',
    name: 'Cut Bar',
    meaning: 'A slim crossbar; the tip sliced off above it',
    pieces: cutA(A, 0.3, 13.1, 12.9, 'g', (side) => (side === 'low' ? [{ d: A.bar(17.6, 19.4), t: 'g' }] : [])),
  },
  {
    id: 'cutbarthin',
    name: 'Cut Hairline',
    meaning: 'An even thinner crossbar',
    pieces: cutA(A, 0.3, 13.1, 12.9, 'g', (side) => (side === 'low' ? [{ d: A.bar(17.9, 19.1), t: 'g' }] : [])),
  },
  {
    id: 'cutthru',
    name: 'Cut Thru Bar',
    meaning: 'A slim crossbar with the cut running through it',
    pieces: cutA(A, 0.2, 13.1, 18, 'g', () => [{ d: A.bar(17.1, 18.9), t: 'g' }]),
  },
  { id: 'cutsteep', name: 'Cut Steep', meaning: 'A sharper, more dramatic cut', pieces: cutA(STEEP, 0.55, 13.2, 15.6) },
  {
    id: 'steepbar',
    name: 'Steep Bar',
    meaning: 'The steep cut with a slim crossbar',
    pieces: cutA(STEEP, 0.55, 13.2, 15.6, 'g', (side) => (side === 'low' ? [{ d: STEEP.bar(17.9, 19.7), t: 'g' }] : [])),
  },
] as const satisfies readonly { id: string; name: string; meaning: string; pieces: readonly Piece[] }[];

export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'cut';

/** The chosen mark: <html data-logo="…"> (set by the demo's picker), else the default. */
function useMark(): LogoMarkId {
  const [mark, setMark] = useState<LogoMarkId>(DEFAULT);
  useEffect(() => {
    const read = () => {
      const v = document.documentElement.dataset.logo;
      setMark(LOGO_MARKS.some((m) => m.id === v) ? (v as LogoMarkId) : DEFAULT);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-logo'] });
    return () => observer.disconnect();
  }, []);
  return mark;
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <LogoMark />
      <span>Creator Engine</span>
    </span>
  );
}

export function LogoMark({ mark: forced, className = 'size-7' }: { mark?: LogoMarkId; className?: string }) {
  const chosen = useMark();
  const mark = LOGO_MARKS.find((m) => m.id === (forced ?? chosen)) ?? LOGO_MARKS[0];
  const id = useId().replace(/:/g, '');
  const fill = (t: Tone): { fill?: string; style?: React.CSSProperties; opacity?: number } => {
    switch (t) {
      case 'a':
        return { style: { fill: 'rgb(var(--brand-a))' } };
      case 'b':
        return { style: { fill: 'rgb(var(--brand-b))' } };
      case 'g':
        return { fill: `url(#g${id})` };
      case 'd':
        return { style: { fill: 'rgb(var(--brand-b))' }, opacity: 0.5 };
    }
  };
  const pieces = mark.pieces as readonly Piece[];
  return (
    <svg viewBox="0 0 28 28" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        {/* One gradient across the whole tile, so pieces that meet share the same colour. */}
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="24" y2="24">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))' }} />
        </linearGradient>
        {pieces.map((p, i) =>
          p.clip ? (
            <clipPath key={i} id={`c${i}${id}`}>
              <polygon points={p.clip} />
            </clipPath>
          ) : null,
        )}
      </defs>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />
      {pieces.map((p, i) => (
        <path key={i} d={p.d} {...fill(p.t)} clipPath={p.clip ? `url(#c${i}${id})` : undefined} transform={p.move} />
      ))}
    </svg>
  );
}
