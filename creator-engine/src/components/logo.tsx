'use client';

// Logo: a sharp A (for Atlas) built from clean geometry: parallel legs of even
// thickness, cut or sliced with even gaps, in the Volt gradient on a dark tile.
// Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

/** Tones: a/b are the Volt stops, g the gradient, d a softer shade, h the tile colour, w a faint white. */
type Tone = 'a' | 'b' | 'g' | 'd' | 'h' | 'w';
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

/** The two sides of the cut drawn as pixel steps instead of a straight line. */
function stairs(offset: number, upper: boolean, step = 2.6) {
  const pts: [number, number][] = [];
  for (let x = -5; x < 33; x += step) {
    const y = onCut(x + step / 2) + offset;
    pts.push([x, y], [x + step, y]);
  }
  const poly = upper ? [[-5, -40], [33, -40], ...pts.reverse()] : [...pts, [33, 40], [-5, 40]];
  return poly.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
}

/** A thin bar along the cut direction ending at (xe, y); for speed lines. */
const streak = (xs: number, xe: number, y: number, th = 0.55) =>
  `M${f(xs)} ${f(y + K * (xe - xs))} ${f(xe)} ${f(y)} ${f(xe)} ${f(y + th)} ${f(xs)} ${f(y + K * (xe - xs) + th)}z`;
const square = (x: number, y: number, s: number) => `M${f(x)} ${f(y)}h${f(s)}v${f(s)}h${f(-s)}z`;

const LASER_ENDS = [2.2, 25.8] as const;
const laser = () => {
  const [x0, x1] = LASER_ENDS;
  return [
    { d: `M${f(x0)} ${f(onCut(x0) - 0.2)} ${f(x1)} ${f(onCut(x1) - 0.2)} ${f(x1)} ${f(onCut(x1) + 0.2)} ${f(x0)} ${f(onCut(x0) + 0.2)}z`, t: 'a' as Tone },
    { d: square(x0 - 0.7, onCut(x0) - 0.7, 1.4) + square(x1 - 0.7, onCut(x1) - 0.7, 1.4), t: 'a' as Tone },
  ];
};
const DOTS = Array.from({ length: 49 }, (_, i) => square(3.15 + 3.5 * (i % 7), 3.15 + 3.5 * Math.floor(i / 7), 0.7)).join('');
const PIXEL_HIGH = stairs(-0.8, true);
const PIXEL_LOW = stairs(0.8, false);

export const LOGO_MARKS = [
  { id: 'thru', name: 'Thru Bar', meaning: 'The A cut through its crossbar, top slid along', pieces: thru() },
  { id: 'laser', name: 'Laser', meaning: 'A laser line through the cut', pieces: [...laser(), ...thru()] },
  {
    id: 'speed',
    name: 'Speed',
    meaning: 'Motion lines behind the sliding piece',
    pieces: [{ d: streak(7.4, 11.5, 8) + streak(6.9, 10.1, 10.6) + streak(6.4, 8.8, 13.2), t: 'd' }, ...thru()],
  },
  {
    id: 'scan',
    name: 'Scan',
    meaning: 'Scanlines through the bottom, like a display',
    pieces: [...thru(), { d: 'M2 20.3h24v.55H2zM2 21.9h24v.55H2zM2 23.3h24v.45H2z', t: 'h', clip: LOW }],
  },
  {
    id: 'pixel',
    name: 'Pixel Cut',
    meaning: 'The cut edge in pixel steps',
    pieces: [
      { d: A.d, t: 'g', clip: PIXEL_LOW },
      { d: BAR, t: 'g', clip: PIXEL_LOW },
      { d: A.d, t: 'g', clip: PIXEL_HIGH, move: SLIDE },
      { d: BAR, t: 'g', clip: PIXEL_HIGH, move: SLIDE },
    ],
  },
  { id: 'wire', name: 'Wireframe', meaning: 'The top piece as an outline, like a hologram', pieces: thru({ line: 1.1 }) },
  { id: 'grid', name: 'Grid', meaning: 'A faint dot grid behind', pieces: [{ d: DOTS, t: 'w' }, ...thru()] },
  {
    id: 'viewfinder',
    name: 'Viewfinder',
    meaning: 'Camera crop brackets around the A',
    zoom: 0.78,
    pieces: [{ d: 'M3 7V3h4v1.2H4.2V7zM25 7V3h-4v1.2h2.8V7zM3 21v4h4v-1.2H4.2V21zM25 21v4h-4v-1.2h2.8V21z', t: 'a', fixed: true }, ...thru()],
  },
  {
    id: 'glitch',
    name: 'Glitch',
    meaning: 'An offset ghost copy, like a glitch',
    pieces: [{ d: A.d, t: 'd', clip: LOW, move: 'translate(-1.3 0)' }, { d: BAR, t: 'd', clip: LOW, move: 'translate(-1.3 0)' }, ...thru()],
  },
  {
    id: 'bits',
    name: 'Bits',
    meaning: 'Pixel bits breaking off the cut',
    pieces: [...thru(), { d: square(24.6, onCut(24.6) - 1.9, 1.3) + square(25.8, onCut(25.8) + 0.6, 0.95) + square(25, onCut(25) + 2.1, 0.7), t: 'a' }],
  },
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
