'use client';

// Creator Engine logo: a mark plus the wordmark. Each mark is a sharp Volt
// shape on a dark tile, built from a play button cut into clean pieces. Shared
// by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

export const LOGO_MARKS = [
  { id: 'cut', name: 'Cut' },
  { id: 'shards', name: 'Shards' },
  { id: 'facet', name: 'Facet' },
  { id: 'wedge', name: 'Wedge' },
] as const;
export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'cut';

const PLAY = 'M8 6 22 14 8 22z';
// Clip regions between parallel slices (y = c - 6x/28), each leaving a 1.8-unit gap.
const band = (top: number, bottom: number) => `0,${top} 28,${top - 6} 28,${bottom - 6} 0,${bottom}`;
const SLICES = {
  cutHigh: band(-10, 15.4),
  cutLow: band(17.2, 40),
  shardTop: band(-10, 12.5),
  shardMid: band(14.3, 18.5),
  shardLow: band(20.3, 40),
};
/** Moves a piece along the slice direction, so its cut edges stay parallel. */
const slide = (d: number) => `translate(${(d * 0.978).toFixed(2)} ${(-d * 0.21).toFixed(2)})`;

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
  const mark = forced ?? chosen;
  const id = useId().replace(/:/g, '');
  const grad = `url(#g${id})`;
  const ink = 'rgb(var(--brand-ink))';
  return (
    <svg viewBox="0 0 28 28" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))' }} />
        </linearGradient>
        {/* Slices all share one angle (rise 6 over 28) so every gap is parallel. */}
        {Object.entries(SLICES).map(([key, points]) => (
          <clipPath key={key} id={`${key}${id}`}>
            <polygon points={points} />
          </clipPath>
        ))}
      </defs>

      {/* Dark tile with a hairline edge. */}
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />

      {mark === 'cut' && (
        // A play button in two pieces; the top piece slides along the slice.
        <>
          <path d={PLAY} fill={grad} clipPath={`url(#cutLow${id})`} />
          <path d={PLAY} fill={grad} clipPath={`url(#cutHigh${id})`} transform={slide(1.7)} />
        </>
      )}

      {mark === 'shards' && (
        // Three pieces from two parallel slices; the middle one slides out.
        <>
          <path d={PLAY} fill={grad} clipPath={`url(#shardTop${id})`} />
          <path d={PLAY} fill={grad} clipPath={`url(#shardMid${id})`} transform={slide(2)} />
          <path d={PLAY} fill={grad} clipPath={`url(#shardLow${id})`} />
        </>
      )}

      {mark === 'facet' && (
        // A play button cut into three facets, each a different Volt tone.
        <g stroke="#0b0b10" strokeWidth="1" strokeLinejoin="round">
          <path d="M8 6 12.7 14 22 14z" style={{ fill: 'rgb(var(--brand-a))' }} />
          <path d="M22 14 12.7 14 8 22z" fill={grad} />
          <path d="M8 22 12.7 14 8 6z" style={{ fill: 'rgb(var(--brand-b))' }} opacity="0.8" />
        </g>
      )}

      {mark === 'wedge' && (
        // A play button with a sharp chevron notch cut out of its back.
        <path d="M7 6 22 14 7 22 11.5 14z" fill={grad} />
      )}
    </svg>
  );
}
