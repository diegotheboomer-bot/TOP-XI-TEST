// Atlas Clips logo: a sharp A (no point-top crossbar gap) cut through its crossbar,
// the top piece slid along the cut, with a ghost copy of the whole mark behind it.
// Clean geometry: parallel legs of even thickness, one straight cut with an even gap.
import { useId } from 'react';

const f = (v: number) => String(Math.round(v * 100) / 100);

/** An A of leg thickness `t` (across the base) with a slim crossbar between y1 and y2. */
function letterA({ t = 5, top = 4, bottom = 24, w = 10.5, dx = 0 } = {}) {
  const s = w / (bottom - top);
  const cx = 14 + dx;
  const [lx, rx] = [cx - w, cx + w];
  const [ilx, irx] = [lx + t, rx - t];
  const iy = bottom - (cx - ilx) / s;
  const body = `M${f(lx)} ${f(bottom)} ${f(cx)} ${f(top)} ${f(rx)} ${f(bottom)} ${f(irx)} ${f(bottom)} ${f(cx)} ${f(iy)} ${f(ilx)} ${f(bottom)}z`;
  const xl = (y: number) => ilx + (bottom - y) * s - 0.3;
  const xr = (y: number) => 2 * cx - xl(y);
  const bar = (y1: number, y2: number) => `M${f(xl(y2))} ${f(y2)} ${f(xr(y2))} ${f(y2)} ${f(xr(y1))} ${f(y1)} ${f(xl(y1))} ${f(y1)}z`;
  return { body, bar };
}

const K = 0.2; // slope of the cut
const [PX, PY] = [13.1, 18]; // a point on the cut
const GAP = 0.8; // half the gap between the pieces
const SLIDE = 2; // how far the top piece slides along the cut

const A = letterA({ dx: -0.9 });
const BAR = A.bar(16.85, 19.15);
const c = PY + K * PX;
const HIGH = `-5,-40 33,-40 33,${f(c - K * 33 - GAP)} -5,${f(c + K * 5 - GAP)}`;
const LOW = `-5,${f(c + K * 5 + GAP)} 33,${f(c - K * 33 + GAP)} 33,40 -5,40`;
const norm = Math.hypot(1, K);
const MOVE = `translate(${f(SLIDE / norm)} ${f((-SLIDE * K) / norm)})`;

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <LogoMark />
      <span>Atlas Clips</span>
    </span>
  );
}

export function LogoMark({ className = 'size-7' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const ghost = { style: { fill: 'rgb(var(--brand-b))' }, opacity: 0.5 };
  const solid = { fill: `url(#g${id})` };
  const lowClip = `url(#l${id})`;
  const highClip = `url(#h${id})`;
  return (
    <svg viewBox="0 0 28 28" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="4" y1="4" x2="24" y2="24">
          <stop offset="0" style={{ stopColor: 'rgb(var(--brand-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--brand-b))' }} />
        </linearGradient>
        <clipPath id={`l${id}`}>
          <polygon points={LOW} />
        </clipPath>
        <clipPath id={`h${id}`}>
          <polygon points={HIGH} />
        </clipPath>
      </defs>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#0b0b10" stroke="rgb(255 255 255 / 0.14)" />
      {/* Ghost copy of the whole mark, a little to the left */}
      <g transform="translate(-1.3 0)">
        <path d={A.body} {...ghost} clipPath={lowClip} />
        <path d={BAR} {...ghost} clipPath={lowClip} />
        <g transform={MOVE}>
          <path d={A.body} {...ghost} clipPath={highClip} />
          <path d={BAR} {...ghost} clipPath={highClip} />
        </g>
      </g>
      {/* The mark: lower piece, then the top piece slid along the cut */}
      <path d={A.body} {...solid} clipPath={lowClip} />
      <path d={BAR} {...solid} clipPath={lowClip} />
      <g transform={MOVE}>
        <path d={A.body} {...solid} clipPath={highClip} />
        <path d={BAR} {...solid} clipPath={highClip} />
      </g>
    </svg>
  );
}
