'use client';

// Creator Engine logo: a mark plus the wordmark. Each mark is a Volt shape on a
// dark tile that shows clipping (cut, snip, pop out, split, trim). Shared by the
// app and the standalone demo.
import { useEffect, useId, useState } from 'react';

export const LOGO_MARKS = [
  { id: 'cut', name: 'Cut' },
  { id: 'snip', name: 'Snip' },
  { id: 'popout', name: 'Pop out' },
  { id: 'split', name: 'Split' },
  { id: 'trim', name: 'Trim' },
] as const;
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
        {/* Cut: the two sides of a diagonal slice with a gap between them */}
        <clipPath id={`t${id}`}>
          <polygon points="0,0 28,0 28,8.9 0,14.9" />
        </clipPath>
        <clipPath id={`b${id}`}>
          <polygon points="0,17.7 28,11.7 28,28 0,28" />
        </clipPath>
        {/* Split: three vertical strips */}
        {[
          [5, 9.6],
          [10.9, 15.5],
          [16.8, 23],
        ].map(([x1, x2], i) => (
          <clipPath key={i} id={`s${i}${id}`}>
            <rect x={x1} y="0" width={x2 - x1} height="28" />
          </clipPath>
        ))}
      </defs>

      {/* All marks share the dark tile with a hairline edge. */}
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />

      {mark === 'cut' && (
        // A play button sliced along a dashed "cut here" line, the top half pulled away.
        <>
          <path d="M8.5 6 21.5 14 8.5 22z" fill={grad} clipPath={`url(#b${id})`} />
          <path d="M8.5 6 21.5 14 8.5 22z" fill={grad} clipPath={`url(#t${id})`} transform="translate(1.6 -1.7) rotate(-5 15 11)" />
          <path d="M3.5 17.3 24.5 12.8" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="1.6 1.5" strokeLinecap="round" />
        </>
      )}

      {mark === 'snip' && (
        // The tip of a play button snipped off and drifting away: a clip is a piece of the stream.
        <>
          <path d="M6.5 6 14 10.14v7.72L6.5 22z" fill={grad} />
          <path d="M14 10.14 21 14l-7 3.86z" fill={grad} transform="translate(3 -2.8) rotate(16 17 14)" />
          <path d="M15.6 6.5v15" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="1.6 1.5" strokeLinecap="round" />
        </>
      )}

      {mark === 'popout' && (
        // A widescreen stream with its vertical 9:16 slice popping out.
        <>
          <rect x="3.5" y="9" width="21" height="12" rx="2.2" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.3" />
          <rect x="10.5" y="9" width="7" height="12" rx="1.6" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="1.5 1.4" />
          <g transform="translate(2.2 -4)">
            <rect x="10.5" y="9" width="7" height="12.4" rx="1.8" fill={grad} />
            <path d="M12.9 12.9 15.6 15.2l-2.7 2.3z" fill={ink} />
          </g>
        </>
      )}

      {mark === 'split' && (
        // A play button cut into three strips: one stream, three platforms.
        <>
          {[0, -1.6, 1.6].map((dy, i) => (
            <path key={i} d="M5 4.5 23 14 5 23.5z" fill={grad} clipPath={`url(#s${i}${id})`} transform={`translate(0 ${dy})`} />
          ))}
        </>
      )}

      {mark === 'trim' && (
        // An editor's trim: in and out markers around the highlighted part of the timeline, playing above.
        <>
          <path d="M11 5 18.5 9.5 11 14z" fill={grad} />
          <path d="M5 20.5h18" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 20.5h8" style={{ stroke: 'rgb(var(--brand-a))' }} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M9.6 17.4v6.2M18.4 17.4v6.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
