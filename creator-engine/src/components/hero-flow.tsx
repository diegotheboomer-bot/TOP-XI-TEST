'use client';

// Landing hero visual, type only (no photos): a stream's chat activity with a
// spike pinned as a moment, and what the clips of it on TikTok, Shorts and
// Reels have earned, ticking up. Decorative (aria-hidden); names and numbers are made up.
import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/types';
import { cn } from './ui/cn';
import { PlatformIcon } from './platform-icon';

const BARS = [3, 4, 3, 5, 4, 6, 5, 4, 5, 6, 8, 11, 14, 16, 15, 13, 10, 7, 6, 5, 4, 5, 4, 3, 4, 5, 6, 5];
const MOMENT = { from: 10, to: 17 };
const RATE = 2; // $ per 1K views
const LOOP = 120; // ticks before the counters start over

const CLIPS: { platform: Platform; name: string; base: number; speed: number }[] = [
  { platform: 'tiktok', name: 'TikTok', base: 48_200, speed: 38 },
  { platform: 'youtube', name: 'YouTube Shorts', base: 44_900, speed: 64 },
  { platform: 'instagram', name: 'Instagram Reels', base: 33_400, speed: 92 },
];

const views = (n: number) => `${(n / 1000).toFixed(1)}K views`;
const money = (n: number) => `$${n.toFixed(2)}`;

export function HeroFlow() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick((t) => (t + 1) % LOOP), 1400);
    return () => clearInterval(id);
  }, []);

  const clips = CLIPS.map((c) => {
    const v = c.base + tick * c.speed;
    return { ...c, views: v, earned: (v / 1000) * RATE };
  });
  const total = clips.reduce((s, c) => s + c.earned, 0);
  const popping = tick > 0 ? tick % clips.length : -1;

  return (
    <div aria-hidden className="relative min-w-0 select-none">
      <div className="pointer-events-none absolute -inset-y-6 inset-x-0 -z-10 rounded-[2rem] bg-brand opacity-[0.07] blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
        {/* The stream, with the moment that got pinned */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-[#ff3b30]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#ff6b61]">
                <span className="hero-pulse size-1.5 rounded-full bg-[#ff3b30]" /> LIVE
              </span>
              <span className="truncate font-medium">marlowkade</span>
            </span>
            <span className="shrink-0 rounded-full bg-brand px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand-ink">moment pinned</span>
          </div>
          <div className="relative mt-5 flex h-16 items-end gap-[3px]">
            {BARS.map((h, i) => (
              <span
                key={i}
                className={cn('flex-1 rounded-full', i >= MOMENT.from && i <= MOMENT.to ? 'bg-brand' : 'bg-zinc-200')}
                style={{ height: `${(h / 16) * 100}%` }}
              />
            ))}
            <span className="hero-playhead absolute -top-1 bottom-0 w-px bg-zinc-900/50" />
          </div>
        </div>

        {/* What its clips earned */}
        <ul className="divide-y divide-zinc-200/80 border-t border-zinc-200/80">
          {clips.map((c, i) => (
            <li key={c.platform} className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-900">
                <PlatformIcon platform={c.platform} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block font-mono text-[11px] tabular-nums text-zinc-500">{views(c.views)}</span>
              </span>
              <span className="relative text-right">
                <span className="block font-semibold tabular-nums tracking-tight">{money(c.earned)}</span>
                {popping === i && (
                  <span key={tick} className="hero-pop absolute -top-4 right-0 font-mono text-[10px] font-semibold text-[rgb(var(--brand-ta))]">
                    +{money((c.speed / 1000) * RATE)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-zinc-200/80 bg-zinc-50 px-5 py-3.5">
          <span className="text-sm text-zinc-500">Paid to clippers</span>
          <span className="text-lg font-semibold tabular-nums tracking-tight text-brand">{money(total)}</span>
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
          <span className="hero-outline px-4 text-3xl font-bold tracking-tight sm:px-6 sm:text-6xl">{w}</span>
          <span className="text-xl text-brand sm:text-3xl">✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="hero-ticker-mask overflow-hidden border-y border-zinc-200/80 py-4 sm:py-5">
      <div className="hero-ticker flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}
