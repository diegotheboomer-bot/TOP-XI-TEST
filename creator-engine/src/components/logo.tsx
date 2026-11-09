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
const hband = (y1: number, y2: number) => `-5,${y1} 33,${y1} 33,${y2} -5,${y2}`;
const vband = (x1: number, x2: number) => `${x1},-40 ${x2},-40 ${x2},40 ${x1},40`;

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
const SLICE_A = a({ top: 6.6, bottom: 24.4, w: 9.6 }); // sits lower so the lifted tip stays inside the tile
const SIDE_L = vband(-5, 11.1);
const SIDE_R = vband(16.9, 33);
const MIDDLE = vband(12.3, 15.7);
const LIFT = 'translate(0 -3)';
const BAR_A = a({ dx: -1.1 });

export const LOGO_MARKS = [
  { id: 'cut', name: 'Cut', meaning: 'The A sliced, top piece slid along the cut', pieces: cutA(A, 0.3, 13.1, 15.2) },
  {
    id: 'cutbar',
    name: 'Cut Bar',
    meaning: 'With a crossbar; the tip sliced off above it',
    pieces: cutA(A, 0.3, 13.1, 12.9, 'g', (side) => (side === 'low' ? [{ d: A.bar(17.2, 19.8), t: 'g' }] : [])),
  },
  {
    id: 'cutthru',
    name: 'Cut Thru Bar',
    meaning: 'With a crossbar; the cut runs through it',
    pieces: cutA(A, 0.2, 13.1, 18, 'g', () => [{ d: A.bar(16.6, 19.2), t: 'g' }]),
  },
  { id: 'cutduo', name: 'Cut Duo', meaning: 'The cut with a lighter top piece', pieces: cutA(A, 0.3, 13.1, 15.2, 'a') },
  { id: 'cutsteep', name: 'Cut Steep', meaning: 'A sharper, more dramatic cut', pieces: cutA(a({ dx: -0.8 }), 0.55, 13.2, 15.6) },
  { id: 'cutmirror', name: 'Cut Mirror', meaning: 'The cut the other way', pieces: cutA(a({ dx: 0.9 }), -0.3, 14.9, 15.2) },
  { id: 'cutthin', name: 'Cut Thin', meaning: 'The cut with slimmer legs', pieces: cutA(a({ t: 3.8, dx: -0.9 }), 0.3, 13.1, 15.2) },
  { id: 'cutbold', name: 'Cut Bold', meaning: 'The cut with heavier legs', pieces: cutA(a({ t: 6.2, dx: -0.9 }), 0.3, 13.1, 15.2) },
  {
    id: 'slice',
    name: 'Slice',
    meaning: 'The middle of the A sliced out and lifted',
    pieces: [
      { d: SLICE_A.d, t: 'g', clip: SIDE_L },
      { d: SLICE_A.d, t: 'g', clip: SIDE_R },
      { d: SLICE_A.d, t: 'g', clip: MIDDLE, move: LIFT },
    ],
  },
  {
    id: 'slicebar',
    name: 'Slice Bar',
    meaning: 'With a crossbar; its band sliced out and slid sideways',
    pieces: [
      { d: BAR_A.d, t: 'g', clip: hband(-40, 15.9) },
      { d: BAR_A.d, t: 'g', clip: hband(20.9, 40) },
      { d: BAR_A.d, t: 'g', clip: hband(17.1, 19.7), move: 'translate(2.4 0)' },
      { d: BAR_A.bar(17.1, 19.7), t: 'g', clip: hband(17.1, 19.7), move: 'translate(2.4 0)' },
    ],
  },
  {
    id: 'sliceduo',
    name: 'Slice Duo',
    meaning: 'The slice with the lifted piece lit up',
    pieces: [
      { d: SLICE_A.d, t: 'd', clip: SIDE_L },
      { d: SLICE_A.d, t: 'd', clip: SIDE_R },
      { d: SLICE_A.d, t: 'a', clip: MIDDLE, move: LIFT },
    ],
  },
  {
    id: 'facetbar',
    name: 'Facet Bar',
    meaning: 'A classic A with a crossbar, in two facets',
    pieces: [
      { d: 'M3.5 24 14 4 14 13.52 8.5 24z', t: 'a' },
      { d: 'M14 4 24.5 24 19.5 24 14 13.52z', t: 'g' },
      { d: a().bar(17.4, 20), t: 'g' },
    ],
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
