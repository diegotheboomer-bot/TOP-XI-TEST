'use client';

// Creator Engine logo: a mark plus the wordmark. Every mark is built from sharp,
// faceted Volt shapes on a dark tile, and each one stands for something in the
// product (the C, the cut, the stream, views, the moment, getting paid).
// Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

/** Facet tones: a/b are the Volt stops, g the gradient, d/e softer shades, h the tile (a hole). */
type Tone = 'a' | 'b' | 'g' | 'd' | 'e' | 'h';
interface Piece {
  d: string;
  t: Tone;
  /** Clip region (see SLICES); with `move`, the whole piece slides as one. */
  clip?: keyof typeof SLICES;
  move?: string;
}

// Parallel slices at one angle (rise 6 over 28), each leaving a 1.8-unit gap.
const band = (top: number, bottom: number) => `0,${top} 28,${top - 6} 28,${bottom - 6} 0,${bottom}`;
const SLICES = {
  cutHigh: band(-10, 15.4),
  cutLow: band(17.2, 40),
  // Slanted cuts around the 9:16 slice of a stream.
  slantLeft: '0,0 11.2,0 8.4,28 0,28',
  slantMid: '12.4,0 18.6,0 15.8,28 9.6,28',
  slantRight: '19.8,0 28,0 28,28 17,28',
  // The C's spine cut away from its arms on a slant.
  cSpine: '0,0 10.6,0 7.8,28 0,28',
  cArms: '11.8,0 28,0 28,28 9,28',
  // Slanted cuts sized for the play button.
  playLeft: '0,0 13.4,0 10.6,28 0,28',
  playMid: '14.6,0 20.6,0 17.8,28 11.8,28',
  playRight: '21.8,0 28,0 28,28 19,28',
  // A slice near the top of the A, taking off its tip.
  tipHigh: band(-10, 11.4),
  tipLow: band(13.2, 40),
  // Two parallel slices: three shards.
  shardTop: band(-10, 12.5),
  shardMid: band(14.3, 18.5),
  shardLow: band(20.3, 40),
};
/** Moves a piece along the slice direction, so its cut edges stay parallel. */
const slide = (d: number) => `translate(${(d * 0.978).toFixed(2)} ${(-d * 0.21).toFixed(2)})`;

const PLAY = 'M8 6 22 14 8 22z';
// A sharp A with no crossbar: two legs meeting in a point.
const A_SHAPE = 'M3.5 24 14 3.5 24.5 24 19.6 24 14 12.6 8.4 24z';
const C_SHAPE = 'M21.5 5 9.6 5 4.6 14 9.6 23 21.5 23 19 18.4 12.5 18.4 9.8 14 12.5 9.6 19 9.6z';
const sliced = (d: string, t: Tone = 'g', by = 1.8): Piece[] => [
  { d, t, clip: 'cutLow' },
  { d, t, clip: 'cutHigh', move: slide(by) },
];

export const LOGO_MARKS = [
  { id: 'acut', name: 'A Cut', meaning: 'A sharp A, sliced', pieces: sliced(A_SHAPE, 'g', 2) },
  { id: 'atip', name: 'A Tip', meaning: 'The tip of the A cut off and lifted', pieces: [
    { d: A_SHAPE, t: 'g', clip: 'tipLow' },
    { d: A_SHAPE, t: 'a', clip: 'tipHigh', move: slide(2.2) },
  ] },
  { id: 'afacet', name: 'A Facet', meaning: 'The A in two facets', pieces: [
    { d: 'M3.5 24 14 3.5 14 12.6 8.4 24z', t: 'a' },
    { d: 'M14 3.5 24.5 24 19.6 24 14 12.6z', t: 'g' },
  ] },
  { id: 'ashard', name: 'A Shards', meaning: 'The A cut twice, middle slid out', pieces: [
    { d: A_SHAPE, t: 'g', clip: 'shardTop' },
    { d: A_SHAPE, t: 'a', clip: 'shardMid', move: slide(2) },
    { d: A_SHAPE, t: 'g', clip: 'shardLow' },
  ] },
  { id: 'aslice', name: 'A Slice', meaning: 'The A with a vertical slice lifted', pieces: [
    { d: A_SHAPE, t: 'a', clip: 'playLeft' },
    { d: A_SHAPE, t: 'g', clip: 'playMid', move: 'translate(0.6 -2.6)' },
    { d: A_SHAPE, t: 'b', clip: 'playRight' },
  ] },
  { id: 'ccut', name: 'C Cut', meaning: 'The C for creator and clip, sliced', pieces: sliced(C_SHAPE) },
  { id: 'cut', name: 'Cut', meaning: 'A clip being cut', pieces: sliced(PLAY, 'g', 1.7) },
  { id: 'facet', name: 'Facet', meaning: 'A faceted play button', pieces: [
    { d: 'M8 6 12.7 14 22 14z', t: 'a' },
    { d: 'M22 14 12.7 14 8 22z', t: 'g' },
    { d: 'M8 22 12.7 14 8 6z', t: 'd' },
  ] },
  { id: 'slice', name: 'Slice', meaning: 'A vertical slice lifted out of a stream', pieces: [
    { d: 'M3.5 9h21v11.8h-21z', t: 'e', clip: 'slantLeft' },
    { d: 'M3.5 9h21v11.8h-21z', t: 'd', clip: 'slantRight' },
    { d: 'M3.5 9h21v11.8h-21z', t: 'g', clip: 'slantMid', move: 'translate(0.7 -3.4)' },
  ] },
  { id: 'facetc', name: 'Facet C', meaning: 'The C in three facets', pieces: [
    { d: 'M21.5 5 9.6 5 12.5 9.6 19 9.6z', t: 'a' },
    { d: 'M9.6 5 4.6 14 9.6 23 12.5 18.4 9.8 14 12.5 9.6z', t: 'g' },
    { d: 'M9.6 23 21.5 23 19 18.4 12.5 18.4z', t: 'd' },
  ] },
  { id: 'slicec', name: 'Slice C', meaning: 'The C with its spine sliced out and lifted', pieces: [
    { d: C_SHAPE, t: 'a', clip: 'cArms' },
    { d: C_SHAPE, t: 'g', clip: 'cSpine', move: 'translate(0.6 -2.8)' },
  ] },
  { id: 'cplay', name: 'C Play', meaning: 'The C holding a play button', pieces: [
    { d: C_SHAPE, t: 'g' },
    { d: 'M14.6 10.8 20.4 14 14.6 17.2z', t: 'a' },
  ] },
  { id: 'cutframe', name: 'Cut Frame', meaning: 'A vertical clip being cut', pieces: sliced('M9 4h10v20H9z', 'g', 1.8) },
  { id: 'facetframe', name: 'Facet Frame', meaning: 'A vertical clip in two facets', pieces: [
    { d: 'M9 4 19 4 9 24z', t: 'a' },
    { d: 'M19 4 19 24 9 24z', t: 'g' },
  ] },
  { id: 'sliceplay', name: 'Slice Play', meaning: 'A play button with its vertical slice lifted out', pieces: [
    { d: PLAY, t: 'a', clip: 'playLeft' },
    { d: PLAY, t: 'g', clip: 'playMid', move: 'translate(0.6 -2.6)' },
    { d: PLAY, t: 'b', clip: 'playRight' },
  ] },
  { id: 'shards', name: 'Shards', meaning: 'One video cut into clips', pieces: [
    { d: PLAY, t: 'g', clip: 'shardTop' },
    { d: PLAY, t: 'g', clip: 'shardMid', move: slide(2) },
    { d: PLAY, t: 'g', clip: 'shardLow' },
  ] },
  { id: 'widetall', name: 'Wide to Tall', meaning: 'A wide stream and the vertical clip made from it', pieces: [
    { d: 'M3.5 8h16v10h-16z', t: 'd' },
    { d: 'M15.5 5h8v17h-8z', t: 'g' },
  ] },
] as const satisfies readonly { id: string; name: string; meaning: string; pieces: readonly Piece[] }[];

export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'acut';

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
      case 'e':
        return { style: { fill: 'rgb(var(--brand-a))' }, opacity: 0.6 };
      case 'h':
        return { fill: '#0b0b10' };
    }
  };
  return (
    <svg viewBox="0 0 28 28" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))' }} />
        </linearGradient>
        {Object.entries(SLICES).map(([key, points]) => (
          <clipPath key={key} id={`${key}${id}`}>
            <polygon points={points} />
          </clipPath>
        ))}
      </defs>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />
      {(mark.pieces as readonly Piece[]).map((p, i) => (
        <path key={i} d={p.d} {...fill(p.t)} clipPath={p.clip ? `url(#${p.clip}${id})` : undefined} transform={p.move} />
      ))}
    </svg>
  );
}
