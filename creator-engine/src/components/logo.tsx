'use client';

// Logo: a sharp A (for Atlas) built from clean geometry: parallel legs of even
// thickness, cut or sliced with even gaps, in the Volt gradient on a dark tile.
// Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

/** Tones: a/b are the Volt stops, g the gradient, d a softer shade, h the tile colour, w a faint white. */
type Tone = 'a' | 'b' | 'g' | 'd' | 'e' | 'f' | 'h' | 'w';
interface Piece {
  d: string;
  t: Tone;
  /** Clip polygon (points). With `move`, the clip moves too, so the piece slides as one. */
  clip?: string;
  move?: string;
  /** Draw as an outline of this width instead of filling. */
  line?: number;
  /** Not scaled by the mark's zoom (e.g. corner brackets). */
  fixed?: boolean;
}
interface Mark {
  id: string;
  name: string;
  meaning: string;
  pieces: readonly Piece[];
  /** Scales the A (not `fixed` pieces) about the centre. */
  zoom?: number;
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

// Every mark is the A with a slim crossbar, cut through the bar and the top slid along.
const K = 0.2;
const PIVOT = [13.1, 18] as const;
const A = a({ dx: -0.9 });
const BAR = A.bar(16.85, 19.15);
const { high: HIGH, low: LOW } = cut(K, ...PIVOT);
const SLIDE = along(K, 2);
const onCut = (x: number) => PIVOT[1] - K * (x - PIVOT[0]);

/** The base mark; `top` and `line` restyle the sliding piece. */
function thru({ top = 'g' as Tone, line }: { top?: Tone; line?: number } = {}): Piece[] {
  return [
    { d: A.d, t: 'g', clip: LOW },
    { d: BAR, t: 'g', clip: LOW },
    { d: A.d, t: top, clip: HIGH, move: SLIDE, line },
    { d: BAR, t: 'g', clip: HIGH, move: SLIDE },
  ];
}

/** A thin bar along the cut direction ending at (xe, y); for speed lines. */
const streak = (xs: number, xe: number, y: number, th = 0.55) =>
  `M${f(xs)} ${f(y + K * (xe - xs))} ${f(xe)} ${f(y)} ${f(xe)} ${f(y + th)} ${f(xs)} ${f(y + K * (xe - xs) + th)}z`;

const SPEED: Piece[] = [{ d: streak(7.4, 11.5, 8) + streak(6.9, 10.1, 10.6) + streak(6.4, 8.8, 13.2), t: 'd' }];
/** A copy of the whole mark (both halves) shifted sideways behind it. */
const ghost = (dx: number, t: Tone): Piece[] => {
  const off = `translate(${dx} 0)`;
  return [
    { d: A.d, t, clip: LOW, move: off },
    { d: BAR, t, clip: LOW, move: off },
    { d: A.d, t, clip: HIGH, move: `${off} ${SLIDE}` },
    { d: BAR, t, clip: HIGH, move: `${off} ${SLIDE}` },
  ];
};
/** Fading copies of the top piece trailing behind it, like motion blur. */
const trail: Piece[] = [
  [-2.8, 'f'],
  [-1.4, 'd'],
].flatMap(([dx, t]) => [
  { d: A.d, t: t as Tone, clip: HIGH, move: `translate(${dx} 0) ${SLIDE}` },
  { d: BAR, t: t as Tone, clip: HIGH, move: `translate(${dx} 0) ${SLIDE}` },
]);
/** A thin band of the top piece knocked sideways, like a glitch. */
const shift: Piece[] = [
  { d: 'M8 9.6h12v2.1H8z', t: 'h', move: SLIDE },
  { d: A.d, t: 'g', clip: '-5,9.6 33,9.6 33,11.7 -5,11.7', move: `${SLIDE} translate(1.6 0)` },
];

export const LOGO_MARKS = [
  { id: 'thru', name: 'Thru Bar', meaning: 'The A cut through its crossbar, top slid along', pieces: thru() },
  { id: 'glitch', name: 'Glitch', meaning: 'A ghost copy behind the whole mark', pieces: [...ghost(-1.3, 'd'), ...thru()] },
  { id: 'glitchspeed', name: 'Glitch Speed', meaning: 'Glitch with motion lines', pieces: [...SPEED, ...ghost(-1.3, 'd'), ...thru()] },
  { id: 'split', name: 'Split', meaning: 'A dark ghost left and a light one right', pieces: [...ghost(-1.3, 'd'), ...ghost(1.1, 'e'), ...thru()] },
  { id: 'splitspeed', name: 'Split Speed', meaning: 'Split with motion lines', pieces: [...SPEED, ...ghost(-1.3, 'd'), ...ghost(1.1, 'e'), ...thru()] },
  { id: 'trail', name: 'Trail', meaning: 'Motion trail behind the sliding piece, with speed lines', pieces: [...SPEED, ...thru().slice(0, 2), ...trail, ...thru().slice(2)] },
  { id: 'shift', name: 'Shift', meaning: 'Glitch with a band knocked sideways', pieces: [...ghost(-1.3, 'd'), ...thru(), ...shift] },
  { id: 'shiftspeed', name: 'Shift Speed', meaning: 'Shift with motion lines', pieces: [...SPEED, ...ghost(-1.3, 'd'), ...thru(), ...shift] },
] as const satisfies readonly Mark[];

export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'thru';

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
  const paint = (t: Tone): { fill?: string; style?: React.CSSProperties; opacity?: number } => {
    switch (t) {
      case 'a':
        return { style: { fill: 'rgb(var(--brand-a))' } };
      case 'b':
        return { style: { fill: 'rgb(var(--brand-b))' } };
      case 'g':
        return { fill: `url(#g${id})` };
      case 'd':
        return { style: { fill: 'rgb(var(--brand-b))' }, opacity: 0.5 };
      case 'e':
        return { style: { fill: 'rgb(var(--brand-a))' }, opacity: 0.55 };
      case 'f':
        return { style: { fill: 'rgb(var(--brand-b))' }, opacity: 0.25 };
      case 'h':
        return { fill: '#0b0b10' };
      case 'w':
        return { fill: 'rgb(255 255 255 / 0.12)' };
    }
  };
  const pieces = mark.pieces as readonly Piece[];
  const zoom = (mark as Mark).zoom;
  const draw = (p: Piece, i: number) => {
    const fill = paint(p.t);
    const look = p.line
      ? { fill: 'none', stroke: fill.fill ?? (fill.style?.fill as string), strokeWidth: p.line, opacity: fill.opacity }
      : fill;
    return <path key={i} d={p.d} {...look} clipPath={p.clip ? `url(#c${i}${id})` : undefined} transform={p.move} />;
  };
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
      {pieces.map((p, i) => (p.fixed ? draw(p, i) : null))}
      <g transform={zoom ? `translate(14 14) scale(${zoom}) translate(-14 -14)` : undefined}>{pieces.map((p, i) => (p.fixed ? null : draw(p, i)))}</g>
    </svg>
  );
}
