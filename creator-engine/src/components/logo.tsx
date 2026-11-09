'use client';

// Creator Engine logo: a mark plus the wordmark. Each mark is something that
// matters to clipping (a stream, a clip, the C, the live dot) cut cleanly in the
// Volt gradient on a dark tile. Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

export const LOGO_MARKS = [
  { id: 'stream', name: 'Stream' },
  { id: 'clip', name: 'Clip' },
  { id: 'c', name: 'C' },
  { id: 'live', name: 'Live' },
] as const;
export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'stream';

// A C open to the right: an arc from 40° round to 320°, radius 8.
const C_PATH = 'M20.13 8.86A8 8 0 1 0 20.13 19.14';
// Clip regions between parallel slices (y = c - 6x/28), each leaving a 1.8-unit gap.
const band = (top: number, bottom: number) => `0,${top} 28,${top - 6} 28,${bottom - 6} 0,${bottom}`;
const SLICES = {
  cutHigh: band(-10, 15.4),
  cutLow: band(17.2, 40),
  // Stream: two vertical cuts around a 9:16 slice of a 16:9 frame.
  streamLeft: '0,0 9.4,0 9.4,28 0,28',
  streamMid: '10.6,0 17.4,0 17.4,28 10.6,28',
  streamRight: '18.6,0 28,0 28,28 18.6,28',
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

      {mark === 'stream' && (
        // A 16:9 stream with its vertical 9:16 slice cut out and lifted: what clippers do.
        <>
          <rect x="3.5" y="9" width="21" height="11.8" rx="2.4" fill={grad} opacity="0.55" clipPath={`url(#streamLeft${id})`} />
          <rect x="3.5" y="9" width="21" height="11.8" rx="2.4" fill={grad} opacity="0.55" clipPath={`url(#streamRight${id})`} />
          <g transform="translate(0 -3.6)">
            <rect x="3.5" y="9" width="21" height="11.8" rx="2.4" fill={grad} clipPath={`url(#streamMid${id})`} />
            <path d="M12.6 12.4 16.2 14.9l-3.6 2.5z" fill={ink} />
          </g>
        </>
      )}

      {mark === 'clip' && (
        // A vertical clip (phone-shaped, with its notch) sliced in two; the top piece slides along the cut.
        <>
          {[
            [`cutLow`, undefined],
            [`cutHigh`, slide(1.8)],
          ].map(([region, move]) => (
            // The transform sits with the clip, so the whole piece (edges included) moves.
            <g key={region} transform={move}>
              <g clipPath={`url(#${region}${id})`}>
                <rect x="8.5" y="3.5" width="11" height="21" rx="3" fill={grad} />
                <rect x="12.3" y="5.6" width="3.4" height="1.3" rx="0.65" fill={ink} />
              </g>
            </g>
          ))}
        </>
      )}

      {mark === 'c' && (
        // A bold C (creator, clip, cut) sliced in two.
        <>
          <path d={C_PATH} fill="none" stroke={grad} strokeWidth="4.6" strokeLinecap="round" clipPath={`url(#cutLow${id})`} />
          <path d={C_PATH} fill="none" stroke={grad} strokeWidth="4.6" strokeLinecap="round" clipPath={`url(#cutHigh${id})`} transform={slide(1.8)} />
        </>
      )}

      {mark === 'live' && (
        // A live / record dot sliced in two inside its ring: a moment cut out of a live stream.
        <>
          <circle cx="14" cy="14" r="10.5" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" />
          <circle cx="14" cy="14" r="7" fill={grad} clipPath={`url(#cutLow${id})`} />
          <circle cx="14" cy="14" r="7" fill={grad} clipPath={`url(#cutHigh${id})`} transform={slide(1.8)} />
        </>
      )}
    </svg>
  );
}
