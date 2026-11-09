'use client';

// Creator Engine logo: a mark plus the wordmark. The marks are built from the
// product's own shapes (crop frame, cut, chat spike, stacked clips, repost loop)
// in the Volt gradient. Shared by the app and the standalone demo.
import { useEffect, useId, useState } from 'react';

export const LOGO_MARKS = [
  { id: 'frame', name: 'Frame' },
  { id: 'cut', name: 'Cut' },
  { id: 'spike', name: 'Spike' },
  { id: 'stack', name: 'Stack' },
  { id: 'loop', name: 'Loop' },
] as const;
export type LogoMarkId = (typeof LOGO_MARKS)[number]['id'];
const DEFAULT: LogoMarkId = 'frame';

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
        <clipPath id={`t${id}`}>
          <polygon points="0,0 28,0 28,9.6 0,15.6" />
        </clipPath>
        <clipPath id={`b${id}`}>
          <polygon points="0,17 28,11 28,28 0,28" />
        </clipPath>
      </defs>

      {mark === 'frame' && (
        // A 9:16 crop frame with a play button: the moment being clipped.
        <>
          <rect width="28" height="28" rx="8" fill={grad} />
          <g fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 9V5.5h3.5M16 5.5h3.5V9M19.5 19v3.5H16M12 22.5H9V19" />
          </g>
          <path d="M12.3 10.6 17.6 14l-5.3 3.4z" fill={ink} />
        </>
      )}

      {mark === 'cut' && (
        // A play button sliced in two, the halves pulled apart: a clip being cut.
        <>
          <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />
          <path d="M9 6.5 21.5 14 9 21.5z" fill={grad} clipPath={`url(#b${id})`} />
          <path d="M9 6.5 21.5 14 9 21.5z" fill={grad} clipPath={`url(#t${id})`} transform="translate(1.2 -1.3)" />
        </>
      )}

      {mark === 'spike' && (
        // Chat activity with one moment spiking and pinned.
        <>
          {[
            [3.5, 19, 0.35],
            [8.5, 14, 0.55],
            [18.5, 13, 0.55],
            [23.5, 18, 0.35],
          ].map(([x, y, o]) => (
            <rect key={x} x={x - 1.6} y={y} width="3.2" height={25 - y} rx="1.6" fill="currentColor" opacity={o} />
          ))}
          <rect x="11.9" y="8" width="4.2" height="17" rx="2.1" fill={grad} />
          <circle cx="14" cy="3.6" r="2.1" fill={grad} />
        </>
      )}

      {mark === 'stack' && (
        // Three vertical clips fanned out: one stream, posted everywhere.
        <>
          <rect x="2" y="7" width="9" height="15" rx="2.6" fill="currentColor" opacity="0.3" transform="rotate(-14 6.5 14.5)" />
          <rect x="17" y="7" width="9" height="15" rx="2.6" fill="currentColor" opacity="0.3" transform="rotate(14 21.5 14.5)" />
          <rect x="8.5" y="3.5" width="11" height="20" rx="3" fill={grad} />
          <path d="M12.4 10.2 17 13.5l-4.6 3.3z" fill={ink} />
        </>
      )}

      {mark === 'loop' && (
        // A play button inside a repost arrow: clips going round every platform.
        <>
          <circle cx="14" cy="14" r="10" fill="none" stroke={grad} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="50 12.8" transform="rotate(-78 14 14)" />
          <path d="M2.8 0-1.7-2.6v5.2z" fill={grad} transform="translate(5.2 9.2) rotate(298.6)" />
          <path d="M11.6 9.8 18.4 14l-6.8 4.2z" fill={grad} />
        </>
      )}
    </svg>
  );
}
