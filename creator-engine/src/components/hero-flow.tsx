'use client';

// Landing hero visual: a streamer's campaign (rate and a budget that drains)
// and what three clips on TikTok, Shorts and Reels have earned, ticking up. Decorative (aria-hidden); names and numbers are made up.
import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/types';
import { PlatformTile } from './platform-icon';

const BUDGET = 5000;
const SPENT_BEFORE = 1_480; // earned by other clips before these three
const RATE = 2; // $ per 1K views
const LOOP = 120; // ticks before the counters start over

const CLIPS: { platform: Platform; name: string; base: number; speed: number }[] = [
  { platform: 'tiktok', name: 'TikTok', base: 48_200, speed: 38 },
  { platform: 'youtube', name: 'YouTube Shorts', base: 44_900, speed: 64 },
  { platform: 'instagram', name: 'Instagram Reels', base: 33_400, speed: 92 },
];

const views = (n: number) => `${(n / 1000).toFixed(1)}K views`;
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        {/* The campaign: rate and a budget that drains as the clips below earn */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-semibold">M</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  marlowkade
                  <span className="flex items-center gap-1 rounded-full bg-[#ff3b30]/15 px-1.5 py-px font-mono text-[9px] font-semibold text-[#ff6b61]">
                    <span className="hero-pulse size-1 rounded-full bg-[#ff3b30]" /> LIVE
                  </span>
                </span>
                <span className="block truncate text-xs text-zinc-500">Ranked grind · season 4</span>
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-ink">${RATE.toFixed(2)} / 1K views</span>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-zinc-500">Campaign budget</span>
              <span className="tabular-nums">
                <span className="font-semibold text-zinc-900">{money(BUDGET - total - SPENT_BEFORE)}</span>
                <span className="text-zinc-500"> left of {money(BUDGET).replace('.00', '')}</span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${((total + SPENT_BEFORE) / BUDGET) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">18 clippers posting · pays only for real views</p>
          </div>
        </div>

        {/* What its clips earned */}
        <ul className="divide-y divide-zinc-200/80 border-t border-zinc-200/80">
          {clips.map((c, i) => (
            <li key={c.platform} className="flex items-center gap-3 px-5 py-3.5">
              <PlatformTile platform={c.platform} />
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
