'use client';

// Landing hero visual: a live game stream with a facecam, a spike in chat that
// gets pinned as a moment, and that moment posted as three vertical clips
// (facecam on top, gameplay below) whose views and earnings tick up.
// Decorative only (aria-hidden); every name and number is illustrative.
import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

// Chat activity per slice of the stream; the spike is the moment that gets clipped.
const BARS = [3, 4, 3, 5, 4, 6, 5, 4, 3, 4, 5, 4, 6, 7, 5, 4, 5, 6, 8, 11, 14, 16, 15, 13, 10, 7, 6, 5, 4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 4, 3];
const MOMENT = { from: 18, to: 26 };
const RATE = 2; // $ per 1K views

const CLIPS = [
  { platform: 'TikTok', crop: '38% 60%', caption: '1v3 clutch', views: 48_200 },
  { platform: 'Shorts', crop: '62% 60%', caption: 'he never saw it', views: 21_900 },
  { platform: 'Reels', crop: '50% 70%', caption: 'chat went crazy', views: 33_400 },
];

const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const earned = (views: number) => (views / 1000) * RATE;

// Overlays sit on photos, so they use fixed colours (the theme's "white" is dark in dark mode).
const WHITE = 'text-[#fff]';
const SHADE = 'bg-[rgb(0_0_0/0.55)] backdrop-blur-sm';

export function HeroClip({ stream, cam }: { stream: string; cam: string }) {
  const { views, deltas } = useTicker(CLIPS.map((c) => c.views));
  const total = views.reduce((a, v) => a + earned(v), 0);

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden>
      {/* Stream */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-[rgb(0_0_0/0.25)]">
        <div className="flex items-center gap-2 px-4 py-3 font-mono text-[11px] text-zinc-500">
          <span className={`flex items-center gap-1.5 rounded bg-rose-600 px-1.5 py-0.5 font-semibold ${WHITE}`}>
            <span className="hero-pulse size-1.5 rounded-full bg-[#fff]" /> LIVE
          </span>
          <span className="truncate text-zinc-700">marlowkade · night city run</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Eye className="size-3" /> 12.4K
          </span>
        </div>

        <div className="relative aspect-video overflow-hidden bg-[#0b0b10]">
          <img src={stream} alt="" className="size-full object-cover" />
          <Hud />
          {/* Clip frame locking onto the action */}
          <div className="hero-frame absolute inset-y-[12%] left-[36%] w-[23%] rounded-md">
            {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
              <span key={c} className={`absolute size-3 rounded-[3px] border-brand-a ${c}`} />
            ))}
          </div>
          {/* Facecam */}
          <div className="absolute bottom-3 right-3 z-10 w-[24%] overflow-hidden rounded-lg ring-2 ring-brand-a/80">
            <img src={cam} alt="" className="aspect-[4/3] w-full object-cover" />
          </div>
          <span className={`absolute left-3 top-3 z-10 rounded-md px-2 py-1 font-mono text-[10px] ${SHADE} ${WHITE}`}>
            <span className="text-brand-a">●</span> clipping 2:14:08 → 9:16
          </span>
        </div>

        {/* Chat activity timeline */}
        <div className="px-4 pb-4 pt-3">
          <div className="relative flex h-12 items-end gap-[3px]">
            {BARS.map((h, i) => {
              const hot = i >= MOMENT.from && i <= MOMENT.to;
              return <span key={i} className={`flex-1 rounded-sm ${hot ? 'bg-brand' : 'bg-zinc-200'}`} style={{ height: `${(h / 16) * 100}%` }} />;
            })}
            <span className="hero-playhead absolute -bottom-1 -top-1 w-px bg-zinc-900" />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
            <span>chat activity</span>
            <span className="rounded bg-brand-a/15 px-1.5 py-0.5 text-zinc-900">moment pinned · 3 slots</span>
          </div>
        </div>
      </div>

      {/* The same moment, posted three ways */}
      <div className="mx-auto px-3 sm:w-[72%] sm:px-0">
        <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="block h-10 w-full overflow-visible">
          {['M150 0 C150 22 50 18 50 40', 'M150 0 L150 40', 'M150 0 C150 22 250 18 250 40'].map((d) => (
            <path key={d} d={d} fill="none" className="hero-flow stroke-brand-a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {CLIPS.map((c, i) => (
            <div
              key={c.platform}
              className="hero-float overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xl shadow-[rgb(0_0_0/0.3)]"
              style={{ animationDelay: `${i * -1.6}s` }}
            >
              {/* Vertical clip: facecam on top, gameplay below, caption on the seam */}
              <div className="relative aspect-[9/14] overflow-hidden bg-[#0b0b10]">
                <img src={cam} alt="" className="absolute inset-x-0 top-0 h-[38%] w-full object-cover" />
                <img src={stream} alt="" className="absolute inset-x-0 bottom-0 h-[62%] w-full object-cover" style={{ objectPosition: c.crop }} />
                <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] ${SHADE} ${WHITE}`}>{c.platform}</span>
                <span
                  className={`absolute inset-x-1 top-[38%] -translate-y-1/2 text-center text-[10px] font-extrabold uppercase leading-tight sm:text-[11px] ${WHITE}`}
                  style={{ textShadow: '0 1px 0 #000, 0 0 6px rgb(0 0 0 / 0.9)' }}
                >
                  {c.caption}
                </span>
                {deltas[i] > 0 && (
                  <span
                    key={views[i]}
                    className="hero-pop absolute bottom-1.5 right-1.5 rounded-full bg-brand px-1.5 font-mono text-[9px] font-semibold leading-4 tabular-nums text-brand-ink shadow-md"
                  >
                    +{money(earned(deltas[i]))}
                  </span>
                )}
              </div>
              {/* Earnings */}
              <div className="px-2.5 py-2">
                <p className="flex items-center gap-1 font-mono text-[10px] tabular-nums text-zinc-500">
                  <Eye className="size-3 shrink-0" /> {compact(views[i])}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-sm">{money(earned(views[i]))}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center font-mono text-[11px] text-zinc-500">
          one moment → <span className="font-semibold tabular-nums text-zinc-900">{money(total)}</span> earned by clippers
        </p>
      </div>
    </div>
  );
}

/** A game HUD drawn over the street photo: kill feed, minimap, crosshair, health. */
function Hud() {
  return (
    <div className={`pointer-events-none absolute inset-0 font-mono ${WHITE}`}>
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1 text-[9px]">
        {[
          ['marlow', 'rook_7'],
          ['marlow', 'v0id'],
        ].map(([a, b]) => (
          <span key={b} className={`rounded px-1.5 py-0.5 ${SHADE}`}>
            <span className="text-brand-a">{a}</span> ⌖ {b}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 24 24" className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 opacity-80" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
      <div className="absolute bottom-3 left-3 w-[30%] space-y-1">
        <div className="flex items-center justify-between text-[9px]">
          <span>HP</span>
          <span className="tabular-nums">72</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(255_255_255/0.2)]">
          <div className="h-full w-[72%] rounded-full bg-brand" />
        </div>
      </div>
      <div className={`absolute left-3 top-11 hidden size-12 rounded-full border border-[rgb(255_255_255/0.3)] sm:block ${SHADE}`}>
        <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-a" />
        <span className="absolute left-[30%] top-[28%] size-1 rounded-full bg-rose-600" />
        <span className="absolute left-[68%] top-[62%] size-1 rounded-full bg-rose-600" />
      </div>
    </div>
  );
}

/**
 * Views that keep climbing a little, like clips taking off, plus the size of
 * each clip's last jump for the "+$" pop. Still when reduced motion is on.
 */
function useTicker(start: number[]): { views: number[]; deltas: number[] } {
  const [state, setState] = useState({ views: start, deltas: start.map(() => 0) });
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setState(({ views }) => {
        // Not every clip moves on every tick, so the pops feel organic.
        const deltas = views.map(() => (Math.random() < 0.6 ? Math.round(80 + Math.random() * 320) : 0));
        return { views: views.map((v, i) => v + deltas[i]), deltas };
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, []);
  return state;
}
