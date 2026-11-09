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
};
/** Moves a piece along the slice direction, so its cut edges stay parallel. */
const slide = (d: number) => `translate(${(d * 0.978).toFixed(2)} ${(-d * 0.21).toFixed(2)})`;

const PLAY = 'M8 6 22 14 8 22z';
const C_SHAPE = 'M21.5 5 9.6 5 4.6 14 9.6 23 21.5 23 19 18.4 12.5 18.4 9.8 14 12.5 9.6 19 9.6z';
const sliced = (d: string, t: Tone = 'g', by = 1.8): Piece[] => [
  { d, t, clip: 'cutLow' },
  { d, t, clip: 'cutHigh', move: slide(by) },
];

export const LOGO_MARKS = [
  { id: 'cfacet', name: 'C Facet', meaning: 'Angular C for creator and clip', pieces: [
    { d: 'M21.5 5 9.6 5 4.6 14 9.8 14 12.5 9.6 19 9.6z', t: 'a' },
    { d: 'M4.6 14 9.8 14 12.5 18.4 19 18.4 21.5 23 9.6 23z', t: 'g' },
  ] },
  { id: 'ccut', name: 'C Cut', meaning: 'The C, sliced', pieces: sliced(C_SHAPE) },
  { id: 'cut', name: 'Cut', meaning: 'A clip being cut', pieces: sliced(PLAY, 'g', 1.7) },
  { id: 'facet', name: 'Facet', meaning: 'A faceted play button', pieces: [
    { d: 'M8 6 12.7 14 22 14z', t: 'a' },
    { d: 'M22 14 12.7 14 8 22z', t: 'g' },
    { d: 'M8 22 12.7 14 8 6z', t: 'd' },
  ] },
  { id: 'blade', name: 'Blade', meaning: 'The edge that cuts the clip', pieces: [
    { d: 'M15.5 3 9 12.5 14 12z', t: 'a' },
    { d: 'M15.5 3 19 11.5 14 12z', t: 'g' },
    { d: 'M9 12.5 14 12 12.5 25z', t: 'd' },
    { d: 'M19 11.5 14 12 12.5 25z', t: 'b' },
  ] },
  { id: 'shardc', name: 'Shard C', meaning: 'A C made of clip pieces', pieces: [
    { d: 'M21 5 10 5 12.6 9.4 19 9.4z', t: 'a' },
    { d: 'M8.4 6.8 11.2 11.6 11.2 17.4 8.4 22.2 4.4 14.5z', t: 'g' },
    { d: 'M21 24 10 24 12.6 19.6 19 19.6z', t: 'b' },
  ] },
  { id: 'slice', name: 'Slice', meaning: 'A vertical slice lifted out of a stream', pieces: [
    { d: 'M3.5 9h21v11.8h-21z', t: 'e', clip: 'slantLeft' },
    { d: 'M3.5 9h21v11.8h-21z', t: 'd', clip: 'slantRight' },
    { d: 'M3.5 9h21v11.8h-21z', t: 'g', clip: 'slantMid', move: 'translate(0.7 -3.4)' },
  ] },
  { id: 'crop', name: 'Crop', meaning: 'Cropping the moment', pieces: [
    { d: 'M4.5 4.5h7.5l-7.5 7.5z', t: 'a' },
    { d: 'M23.5 4.5h-7.5l7.5 7.5z', t: 'g' },
    { d: 'M4.5 23.5h7.5l-7.5-7.5z', t: 'g' },
    { d: 'M23.5 23.5h-7.5l7.5-7.5z', t: 'b' },
    { d: 'M12.2 10.8 17.4 14l-5.2 3.2z', t: 'a' },
  ] },
  { id: 'bolt', name: 'Bolt', meaning: 'Going viral', pieces: [
    { d: 'M17 3 7 16 13.2 16 14.8 11.5z', t: 'a' },
    { d: 'M14.8 11.5 21 11.5 10.5 25 13.2 16z', t: 'g' },
  ] },
  { id: 'climb', name: 'Climb', meaning: 'Views climbing', pieces: [
    { d: 'M14 3.5 23 12.5 19.6 12.5 14 6.9 8.4 12.5 5 12.5z', t: 'a' },
    { d: 'M14 9.5 23 18.5 19.6 18.5 14 12.9 8.4 18.5 5 18.5z', t: 'g' },
    { d: 'M14 15.5 23 24.5 19.6 24.5 14 18.9 8.4 24.5 5 24.5z', t: 'd' },
  ] },
  { id: 'gem', name: 'Gem', meaning: 'Getting paid', pieces: [
    { d: 'M4 11.5 10 4 11.2 11.5z', t: 'a' },
    { d: 'M10 4 18 4 16.8 11.5 11.2 11.5z', t: 'g' },
    { d: 'M18 4 24 11.5 16.8 11.5z', t: 'b' },
    { d: 'M4 11.5 11.2 11.5 14 24.5z', t: 'd' },
    { d: 'M11.2 11.5 16.8 11.5 14 24.5z', t: 'g' },
    { d: 'M16.8 11.5 24 11.5 14 24.5z', t: 'e' },
  ] },
  { id: 'spark', name: 'Spark', meaning: 'The highlight moment', pieces: [
    { d: 'M14 14 14 3 11.8 11.8z', t: 'a' },
    { d: 'M14 14 14 3 16.2 11.8z', t: 'g' },
    { d: 'M14 14 25 14 16.2 11.8z', t: 'a' },
    { d: 'M14 14 25 14 16.2 16.2z', t: 'g' },
    { d: 'M14 14 14 25 16.2 16.2z', t: 'a' },
    { d: 'M14 14 14 25 11.8 16.2z', t: 'd' },
    { d: 'M14 14 3 14 11.8 16.2z', t: 'a' },
    { d: 'M14 14 3 14 11.8 11.8z', t: 'g' },
  ] },
  { id: 'ce', name: 'CE', meaning: 'Creator Engine monogram', pieces: [
    { d: 'M15 5 8.5 5 4 14 8.5 23 15 23 13 19 11 19 8.6 14 11 9 13 9z', t: 'g' },
    { d: 'M17 5 24 5 22 9 17 9z', t: 'a' },
    { d: 'M17 12 22.5 12 21 16 17 16z', t: 'b' },
    { d: 'M17 19 22 19 24 23 17 23z', t: 'a' },
  ] },
  { id: 'prism', name: 'Prism', meaning: 'One stream, three platforms', pieces: [
    { d: 'M4 6 13 14 4 22z', t: 'g' },
    { d: 'M14.5 13.3 24 5.5 24 9z', t: 'a' },
    { d: 'M14.5 14 24 12.2 24 15.8z', t: 'b' },
    { d: 'M14.5 14.7 24 19 24 22.5z', t: 'd' },
  ] },
  { id: 'bezel', name: 'Bezel', meaning: 'The vertical clip', pieces: [
    { d: 'M8 3 20 3 17.5 6 10.5 6z', t: 'a' },
    { d: 'M20 3 20 25 17.5 22 17.5 6z', t: 'g' },
    { d: 'M8 25 20 25 17.5 22 10.5 22z', t: 'b' },
    { d: 'M8 3 8 25 10.5 22 10.5 6z', t: 'd' },
    { d: 'M12.6 11.6 16 14 12.6 16.4z', t: 'a' },
  ] },
  { id: 'skip', name: 'Skip', meaning: 'Straight to the moment', pieces: [
    { d: 'M4 7 12.5 14 4 21z', t: 'd' },
    ...sliced('M12.5 7 23 14 12.5 21z', 'g', 1.5),
  ] },
  { id: 'cube', name: 'Cube', meaning: 'The engine', pieces: [
    { d: 'M14 4 22.7 9 14 14 5.3 9z', t: 'a' },
    { d: 'M5.3 9 14 14 14 24 5.3 19z', t: 'd' },
    { d: 'M22.7 9 14 14 14 24 22.7 19z', t: 'g' },
  ] },
  { id: 'pin', name: 'Pin', meaning: 'The pinned moment', pieces: [
    { d: 'M14 3 8 7 8 13 14 25z', t: 'a' },
    { d: 'M14 3 20 7 20 13 14 25z', t: 'g' },
    { d: 'M14 7.4 16.6 10 14 12.6 11.4 10z', t: 'h' },
  ] },
  { id: 'check', name: 'Check', meaning: 'Verified views', pieces: [
    { d: 'M4 14.5 8 10.5 12 14.5 12 22.5z', t: 'a' },
    { d: 'M12 14.5 21 5.5 25 9.5 12 22.5z', t: 'g' },
  ] },
  { id: 'peak', name: 'Peak', meaning: 'The chat spike', pieces: [
    { d: 'M3 24 8 13 13 24z', t: 'd' },
    { d: 'M16.5 4 9 24 16.5 24z', t: 'a' },
    { d: 'M16.5 4 24 24 16.5 24z', t: 'g' },
  ] },
] as const satisfies readonly { id: string; name: string; meaning: string; pieces: readonly Piece[] }[];

export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'cfacet';

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
