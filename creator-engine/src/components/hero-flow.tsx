'use client';

// Landing hero visual, type only (no photos): a stream's chat activity with a
// spike pinned as a moment, lines carrying it out to TikTok, Shorts and Reels,
// and a live leaderboard of what each clip has earned. Hover a platform to
// light up its line. Decorative (aria-hidden); every name and number is made up.
import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { cn } from './ui/cn';
import { PlatformIcon } from './platform-icon';

const ICON = { tiktok: 'tiktok', shorts: 'youtube', reels: 'instagram' } as const;

const BARS = [3, 4, 3, 5, 4, 6, 5, 4, 3, 4, 5, 4, 6, 7, 5, 4, 5, 6, 8, 11, 14, 16, 15, 13, 10, 7, 6, 5, 4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 4, 3];
const MOMENT = { from: 18, to: 26 };
const RATE = 2; // $ per 1K views
const LOOP = 120; // ticks before the counters start over

const LANES = [
  {
    id: 'tiktok',
    word: 'TikTok',
    handle: '@clipsbyrae',
    base: 48_200,
    speed: 38,
    color: '#25f4ee',
    wordStyle: { textShadow: '1.5px 0 0 #fe2c55, -1.5px 0 0 #25f4ee' } as React.CSSProperties,
    spark: [2, 3, 3, 5, 6, 9, 12, 13, 15, 18, 19, 21],
  },
  {
    id: 'shorts',
    word: 'Shorts',
    handle: '@vodvault',
    base: 44_900,
    speed: 64,
    color: '#ff3b30',
    wordStyle: { color: '#ff3b30' } as React.CSSProperties,
    spark: [1, 1, 2, 4, 5, 6, 8, 11, 13, 16, 19, 22],
  },
  {
    id: 'reels',
    word: 'Reels',
    handle: '@framejump',
    base: 33_400,
    speed: 92,
    color: '#e1306c',
    wordStyle: {
      backgroundImage: 'linear-gradient(90deg, #feda75, #fa7e1e, #d62976, #962fbf)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    } as React.CSSProperties,
    spark: [1, 2, 2, 3, 4, 6, 7, 9, 12, 15, 19, 23],
  },
] as const;

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
const money = (n: number) => `$${n.toFixed(2)}`;

function sparkPath(pts: readonly number[], w = 100, h = 28) {
  const max = Math.max(...pts);
  return pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * w).toFixed(1)} ${(h - (p / max) * (h - 2) - 1).toFixed(1)}`).join(' ');
}

export function HeroFlow() {
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick((t) => (t + 1) % LOOP), 1100);
    return () => clearInterval(id);
  }, []);

  const lanes = LANES.map((l) => {
    const views = l.base + tick * l.speed;
    return { ...l, views, earned: (views / 1000) * RATE };
  });
  const ranked = [...lanes].sort((a, b) => b.earned - a.earned).map((l) => l.id);
  const total = lanes.reduce((s, l) => s + l.earned, 0);
  const popping = tick > 0 ? lanes[tick % 3] : null;

  return (
    <div aria-hidden className="relative min-w-0 select-none">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
        {/* Stream header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 px-4 py-3 font-mono text-[11px] sm:px-5">
          <span className="flex min-w-0 items-center gap-2 truncate text-zinc-600">
            <span className="flex items-center gap-1.5 rounded bg-[#ff3b30] px-1.5 py-0.5 font-semibold text-[#fff]">
              <span className="hero-pulse size-1.5 rounded-full bg-[#fff]" /> LIVE
            </span>
            marlowkade · ranked grind
          </span>
          <span className="shrink-0 tabular-nums text-zinc-500">02:14:08</span>
        </div>

        {/* Chat activity with the pinned moment */}
        <div className="px-4 pt-5 sm:px-5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <span>chat activity</span>
            <span className="rounded bg-brand px-1.5 py-0.5 font-semibold normal-case tracking-normal text-brand-ink">moment pinned · 3 slots</span>
          </div>
          <div className="relative mt-3 flex h-24 items-end gap-[3px]">
            {BARS.map((h, i) => {
              const inMoment = i >= MOMENT.from && i <= MOMENT.to;
              return (
                <span
                  key={i}
                  className={cn('flex-1 rounded-t-[2px] transition-colors', inMoment ? 'bg-brand' : 'bg-zinc-200')}
                  style={{ height: `${(h / 16) * 100}%` }}
                />
              );
            })}
            <span className="hero-playhead absolute -top-1 bottom-0 w-px bg-zinc-900/70" />
            <span
              className="absolute -bottom-1 -top-2 rounded-md border border-dashed border-brand-b/70"
              style={{ left: `${(MOMENT.from / BARS.length) * 100}%`, width: `${((MOMENT.to - MOMENT.from + 1) / BARS.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] tabular-nums text-zinc-400">
            <span>1:58:00</span>
            <span className="text-zinc-700">2:14:08 → 2:14:41</span>
            <span>2:30:00</span>
          </div>
        </div>

        {/* Lines from the moment to each platform */}
        <svg viewBox="0 0 300 44" preserveAspectRatio="none" className="block h-11 w-full">
          {[50, 150, 250].map((x, i) => {
            const on = hover === LANES[i].id;
            return (
              <path
                key={x}
                d={`M${((MOMENT.from + MOMENT.to + 1) / 2 / BARS.length) * 300} 0 C 165 22, ${x} 18, ${x} 44`}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className={cn('hero-flow transition-[stroke,stroke-width]', on ? 'stroke-brand-a' : 'stroke-zinc-300')}
                strokeWidth={on ? 2 : 1.25}
              />
            );
          })}
        </svg>

        {/* Platforms */}
        <div className="grid grid-cols-3 border-t border-zinc-200/80">
          {lanes.map((l, i) => {
            const rank = ranked.indexOf(l.id) + 1;
            const on = hover === l.id;
            return (
              <div
                key={l.id}
                onMouseEnter={() => setHover(l.id)}
                onMouseLeave={() => setHover(null)}
                className={cn('relative min-w-0 px-3 pb-4 pt-3.5 transition-colors sm:px-4', i > 0 && 'border-l border-zinc-200/80', on && 'bg-zinc-50')}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={cn('font-mono text-[10px] font-semibold tabular-nums', rank === 1 ? 'text-brand' : 'text-zinc-400')}>#{rank}</span>
                  <PlatformIcon platform={ICON[l.id]} className={cn('size-4 transition-colors', on ? 'text-[rgb(var(--brand-ta))]' : 'text-zinc-400')} />
                </div>
                <p className="mt-1.5 truncate text-lg font-bold tracking-tight sm:text-[1.4rem]" style={l.wordStyle}>
                  {l.word}
                </p>
                <p className="truncate font-mono text-[10px] text-zinc-500">{l.handle}</p>
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-3 block h-7 w-full overflow-visible">
                  <path d={`${sparkPath(l.spark)} L100 28 L0 28Z`} style={{ fill: l.color, opacity: on ? 0.16 : 0.08 }} className="transition-opacity" />
                  <path d={sparkPath(l.spark)} fill="none" stroke={l.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" pathLength={1} className="hero-draw" />
                </svg>
                <p className="mt-2.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-zinc-500">
                  <Eye className="size-3" /> {fmt(l.views)}
                </p>
                <p className="text-base font-semibold tabular-nums tracking-tight sm:text-lg">{money(l.earned)}</p>
                {popping?.id === l.id && (
                  <span key={tick} className="hero-pop absolute bottom-5 right-2 rounded-full bg-brand px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-ink">
                    +{money((l.speed / 1000) * RATE)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200/80 px-4 py-3 font-mono text-[11px] sm:px-5">
          <span className="text-zinc-500">paid to clippers · ${RATE.toFixed(2)} / 1K views</span>
          <span className="text-sm font-semibold tabular-nums text-brand">{money(total)}</span>
        </div>
      </div>
    </div>
  );
}

/** Big outlined platform words scrolling across the page. */
export function WordTicker() {
  const words = ['TikTok', 'Shorts', 'Reels', 'Clipped', 'Posted', 'Paid per view'];
  const row = (
    <span className="flex shrink-0 items-center">
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className="hero-outline px-6 text-4xl font-bold tracking-tight sm:text-6xl">{w}</span>
          <span className="text-2xl text-brand sm:text-3xl">✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="hero-ticker-mask overflow-hidden border-y border-zinc-200/80 py-5">
      <div className="hero-ticker flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
