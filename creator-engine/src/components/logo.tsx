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
  { id: 'acut', name: 'Cut', meaning: 'A sharp A, sliced', pieces: sliced(A_SHAPE, 'g', 2) },
  { id: 'atip', name: 'Tip', meaning: 'The tip cut off and lifted', pieces: [
    { d: A_SHAPE, t: 'g', clip: 'tipLow' },
    { d: A_SHAPE, t: 'a', clip: 'tipHigh', move: slide(2.2) },
  ] },
  { id: 'afacet', name: 'Facet', meaning: 'Two-tone legs', pieces: [
    { d: 'M3.5 24 14 3.5 14 12.6 8.4 24z', t: 'a' },
    { d: 'M14 3.5 24.5 24 19.6 24 14 12.6z', t: 'g' },
  ] },
  { id: 'ashard', name: 'Shards', meaning: 'Cut twice, middle slid out', pieces: [
    { d: A_SHAPE, t: 'g', clip: 'shardTop' },
    { d: A_SHAPE, t: 'a', clip: 'shardMid', move: slide(2) },
    { d: A_SHAPE, t: 'g', clip: 'shardLow' },
  ] },
  { id: 'aslice', name: 'Slice', meaning: 'A vertical slice lifted', pieces: [
    { d: A_SHAPE, t: 'a', clip: 'playLeft' },
    { d: A_SHAPE, t: 'g', clip: 'playMid', move: 'translate(0.6 -2.6)' },
    { d: A_SHAPE, t: 'b', clip: 'playRight' },
  ] },
  { id: 'aframe', name: 'Frame', meaning: 'A triangle outline', pieces: [
    { d: 'M3 24.5 14 3 25 24.5z', t: 'g' },
    { d: 'M7.6 21.8 14 9.2 20.4 21.8z', t: 'h' },
  ] },
  { id: 'astencil', name: 'Stencil', meaning: 'Legs that never touch', pieces: [
    { d: 'M3.5 24 12.9 5.6 12.9 14.8 8.4 24z', t: 'a' },
    { d: 'M15.1 5.6 24.5 24 19.6 24 15.1 14.8z', t: 'g' },
  ] },
  { id: 'anotch', name: 'Notch', meaning: 'A solid triangle with a notch', pieces: [
    { d: 'M3.5 24 14 3.5 24.5 24z', t: 'g' },
    { d: 'M10.5 24 14 16.5 17.5 24z', t: 'h' },
  ] },
  { id: 'apeak', name: 'Peak', meaning: 'A mountain with a bright cap', pieces: [
    { d: 'M3.5 24 14 3.5 24.5 24z', t: 'd' },
    { d: 'M14 3.5 18.7 12.7 16 11.2 14 13 12 11.2 9.3 12.7z', t: 'a' },
  ] },
  { id: 'ahex', name: 'Hex', meaning: 'An A cut out of a hexagon', pieces: [
    { d: 'M14 3 23.5 8.5 23.5 19.5 14 25 4.5 19.5 4.5 8.5z', t: 'g' },
    { d: 'M8.6 21 14 9 19.4 21 16.6 21 14 15 11.4 21z', t: 'h' },
  ] },
  { id: 'anest', name: 'Nested', meaning: 'An A inside an A', pieces: [
    { d: A_SHAPE, t: 'g' },
    { d: 'M10.4 24 14 17 17.6 24 16 24 14 20 12 24z', t: 'a' },
  ] },
  { id: 'aitalic', name: 'Lean', meaning: 'A forward-leaning A', pieces: [
    { d: 'M4.5 24 16.5 3.5 15.4 13.4 9.4 24z', t: 'a' },
    { d: 'M16.5 3.5 23.5 24 18.7 24 15.4 13.4z', t: 'g' },
  ] },
  { id: 'astep', name: 'Step', meaning: 'The halves offset', pieces: [
    { d: 'M3.5 24 14 3.5 14 12.6 8.4 24z', t: 'a' },
    { d: 'M14 3.5 24.5 24 19.6 24 14 12.6z', t: 'g', move: 'translate(0 2.5)' },
  ] },
  { id: 'apixel', name: 'Pixel', meaning: 'A blocky, game-style A', pieces: [
    { d: 'M11.8 3.5h4.4v4.4h-4.4z', t: 'a' },
    { d: 'M8 9h4.4v4.4H8zM15.6 9H20v4.4h-4.4z', t: 'g' },
    { d: 'M4.2 14.5h4.4v4.4H4.2zM19.4 14.5h4.4v4.4h-4.4z', t: 'g' },
    { d: 'M4.2 20h4.4v4.4H4.2zM19.4 20h4.4v4.4h-4.4z', t: 'd' },
  ] },
  { id: 'abars', name: 'Bars', meaning: 'Rising bars shaped like an A', pieces: [
    { d: 'M3.6 18h3.6v6H3.6zM20.8 18h3.6v6h-3.6z', t: 'd' },
    { d: 'M8 11h3.6v13H8zM16.4 11H20v13h-3.6z', t: 'a' },
    { d: 'M12.2 4h3.6v20h-3.6z', t: 'g' },
  ] },
  { id: 'asquare', name: 'Block', meaning: 'An A cut out of a square', pieces: [
    { d: 'M4 4h20v20H4z', t: 'g' },
    { d: 'M7 24 14 7.5 21 24 17.4 24 14 15.6 10.6 24z', t: 'h' },
  ] },
  { id: 'adiamond', name: 'Diamond', meaning: 'An A cut out of a diamond', pieces: [
    { d: 'M14 3 25 14 14 25 3 14z', t: 'g' },
    { d: 'M9 19 14 8.6 19 19 16.8 19 14 13.2 11.2 19z', t: 'h' },
  ] },
  { id: 'athin', name: 'Mono', meaning: 'A thin, minimal A', pieces: [{ d: 'M5 24 14 4 23 24 20.8 24 14 9 7.2 24z', t: 'g' }] },
  { id: 'aplay', name: 'Play', meaning: 'A play button between the legs', pieces: [
    { d: A_SHAPE, t: 'g' },
    { d: 'M12.6 17.6 16.2 20.4 12.6 23.2z', t: 'a' },
  ] },
  { id: 'abolt', name: 'Bolt', meaning: 'A sharp A with a lightning cut', pieces: [
    { d: A_SHAPE, t: 'g', clip: 'cutLow' },
    { d: A_SHAPE, t: 'b', clip: 'cutHigh', move: 'translate(-1.6 -1.2)' },
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
