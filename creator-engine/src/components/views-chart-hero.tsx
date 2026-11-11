'use client';

// Home page hero visual: views climbing like a stock chart. The line draws in, the
// numbers tick up live, you can switch platforms and hover/drag to read any day.
// Illustrative numbers, not real campaign data.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { PlatformIcon } from './platform-icon';
import { cn } from './ui/cn';

type Key = 'all' | 'tiktok' | 'youtube' | 'instagram';
const SERIES: { key: Key; label: string; scale: number; seed: number }[] = [
  { key: 'all', label: 'All', scale: 1, seed: 7 },
  { key: 'tiktok', label: 'TikTok', scale: 0.48, seed: 3 },
  { key: 'youtube', label: 'Shorts', scale: 0.31, seed: 11 },
  { key: 'instagram', label: 'Reels', scale: 0.21, seed: 5 },
];
const DAYS = 30;
const W = 600;
const H = 220;

/** A steady climb with realistic wobbles, like a campaign going viral. */
function series(scale: number, seed: number): number[] {
  let x = seed;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const out: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const t = d / (DAYS - 1);
    const trend = Math.pow(t, 2.2) * 2_400_000 + t * 180_000;
    const wobble = (rand() - 0.45) * 90_000 * (0.3 + t);
    out.push(Math.max(0, (trend + wobble) * scale));
  }
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] * 0.97);
  return out;
}

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n)));

export function ViewsChartHero() {
  const [key, setKey] = useState<Key>('all');
  const [hover, setHover] = useState<number | null>(null);
  const [live, setLive] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const s = SERIES.find((x) => x.key === key)!;
  const data = useMemo(() => series(s.scale, s.seed), [s.scale, s.seed]);
  const max = Math.max(...data) * 1.08;

  // Live ticker: views keep coming in while you watch.
  useEffect(() => {
    setLive(0);
    const id = setInterval(() => setLive((v) => v + Math.round(40 + Math.random() * 260 * s.scale)), 120);
    return () => clearInterval(id);
  }, [s.scale]);

  const pts = data.map((v, i) => [(i / (DAYS - 1)) * W, H - (v / max) * H] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const total = data[DAYS - 1] + live;
  const growth = Math.round(((data[DAYS - 1] - data[DAYS - 15]) / Math.max(1, data[DAYS - 15])) * 100);
  const shown = hover ?? DAYS - 1;
  const [hx, hy] = pts[shown];
  const earned = (total / 1000) * 2; // $2 per 1K views, the example rate

  const onMove = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (DAYS - 1));
    setHover(Math.min(DAYS - 1, Math.max(0, i)));
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Floating "up" markers */}
      <span className="hero-float pointer-events-none absolute -left-4 top-[58%] z-10 hidden items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-brand-ink shadow-lg sm:inline-flex">
        <TrendingUp className="size-3.5" /> +{growth}% in 2 weeks
      </span>
      <span className="hero-float pointer-events-none absolute -right-4 top-[66%] z-10 hidden items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-lg sm:inline-flex" style={{ animationDelay: '1.2s' }}>
        <ArrowUpRight className="size-3.5 text-[rgb(var(--brand-ta))]" /> 48 clips posted today
      </span>

      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand opacity-[0.12] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="hero-pulse size-2 rounded-full bg-brand-b" /> Live views · example campaign
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">{hover == null ? fmt(total) : fmt(data[shown])}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-brand-a/15 px-1.5 py-0.5 font-semibold text-[rgb(var(--brand-ta))]">
                <ArrowUpRight className="size-3.5" /> {growth}%
              </span>
              <span className="text-zinc-500">{hover == null ? 'and climbing' : `day ${shown + 1} of 30`}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Paid to clippers</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-brand">${Math.round(hover == null ? earned : (data[shown] / 1000) * 2).toLocaleString('en-US')}</p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {SERIES.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setKey(x.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                key === x.key ? 'border-transparent bg-brand text-brand-ink' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
              )}
            >
              {x.key !== 'all' && <PlatformIcon platform={x.key} className="size-3" />}
              {x.label}
            </button>
          ))}
        </div>

        <div className="relative mt-4">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="relative h-48 w-full touch-none sm:h-60"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Example chart of views rising over 30 days"
        >
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'rgb(var(--brand-b))', stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: 'rgb(var(--brand-b))', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" style={{ stopColor: 'rgb(var(--brand-a))' }} />
              <stop offset="100%" style={{ stopColor: 'rgb(var(--brand-b))' }} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="stroke-zinc-200" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
          ))}
          <clipPath id="hero-reveal">
            <rect key={`r-${key}`} x="0" y="-10" width={W} height={H + 20} className="hero-reveal" />
          </clipPath>
          <g clipPath="url(#hero-reveal)">
            <path d={area} fill="url(#hero-area)" />
            <path d={line} fill="none" stroke="url(#hero-line)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          {hover != null && <line x1={hx} x2={hx} y1="0" y2={H} className="stroke-zinc-400" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
        </svg>
          {/* The glowing point sits outside the stretched SVG so it stays round. */}
          <span
            className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-4 ring-brand-a/30"
            style={{ left: `${(hx / W) * 100}%`, top: `${(hy / H) * 100}%` }}
          >
            {hover == null && <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />}
          </span>
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2 text-center sm:gap-3">
          {[
            ['Clips posted', (1248 + Math.floor(live / 900)).toLocaleString('en-US')],
            ['Clippers', '214'],
            ['Cost per 1K views', '$2.00'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-zinc-50 px-2 py-2.5">
              <p className="text-base font-semibold tabular-nums sm:text-lg">{v}</p>
              <p className="text-[11px] text-zinc-500">{k}</p>
            </div>
          ))}
        </div>
        <p className="relative mt-3 text-center text-[11px] text-zinc-400">Example campaign. Drag across the chart to see each day.</p>
      </div>
    </div>
  );
}
