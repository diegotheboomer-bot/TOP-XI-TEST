"use client";

// Landing hero visual: a live stream, a spike in chat that gets pinned as a
// moment, and the same moment posted as three vertical clips whose views and
// earnings tick up. Decorative only (aria-hidden); numbers are illustrative.
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

// Chat activity per slice of the stream; the spike is the moment that gets clipped.
const BARS = [
  3, 4, 3, 5, 4, 6, 5, 4, 3, 4, 5, 4, 6, 7, 5, 4, 5, 6, 8, 11, 14, 16, 15, 13,
  10, 7, 6, 5, 4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 4, 3,
];
const MOMENT = { from: 18, to: 26 };

const CLIPS = [
  { platform: "TikTok", crop: "30% 50%", views: 48_200, rate: 2 },
  { platform: "Shorts", crop: "55% 50%", views: 21_900, rate: 2 },
  { platform: "Reels", crop: "75% 50%", views: 33_400, rate: 2 },
];

const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

export function HeroClip({ image }: { image: string }) {
  const views = useTicker(CLIPS.map((c) => c.views));

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden>
      {/* Stream */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-[rgb(0_0_0/0.25)]">
        <div className="flex items-center gap-2 px-4 py-3 font-mono text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5 rounded bg-rose-600 px-1.5 py-0.5 font-semibold text-[#fff]">
            <span className="hero-pulse size-1.5 rounded-full bg-[#fff]" /> LIVE
          </span>
          <span className="truncate text-zinc-700">
            marlowkade · ranked grind
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Eye className="size-3" /> 12.4K
          </span>
        </div>
        <div className="relative aspect-video overflow-hidden bg-zinc-900">
          <img src={image} alt="" className="size-full object-cover" />
          {/* Clip frame sweeping onto the action */}
          <div className="hero-frame absolute inset-y-[14%] left-[30%] w-[22%] rounded-md">
            {[
              "left-0 top-0 border-l-2 border-t-2",
              "right-0 top-0 border-r-2 border-t-2",
              "bottom-0 left-0 border-b-2 border-l-2",
              "bottom-0 right-0 border-b-2 border-r-2",
            ].map((c) => (
              <span
                key={c}
                className={`absolute size-3 rounded-[3px] border-brand-a ${c}`}
              />
            ))}
          </div>
          <span className="absolute left-3 top-3 z-10 rounded-md bg-[rgb(0_0_0/0.6)] px-2 py-1 font-mono text-[10px] text-[#fff] backdrop-blur">
            <span className="text-brand-a">●</span> clipping 2:14:08 → 9:16
          </span>
        </div>
        {/* Chat activity timeline */}
        <div className="px-4 pb-4 pt-3">
          <div className="relative flex h-12 items-end gap-[3px]">
            {BARS.map((h, i) => {
              const hot = i >= MOMENT.from && i <= MOMENT.to;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-sm ${hot ? "bg-brand" : "bg-zinc-200"}`}
                  style={{ height: `${(h / 16) * 100}%` }}
                />
              );
            })}
            <span className="hero-playhead absolute -bottom-1 -top-1 w-px bg-zinc-900" />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
            <span>chat activity</span>
            <span className="rounded bg-brand-a/15 px-1.5 py-0.5 text-zinc-900">
              moment pinned · 3 slots
            </span>
          </div>
        </div>
      </div>

      {/* The same moment, posted three ways */}
      <div className="mx-auto px-3 sm:w-[68%] sm:px-0">
        <svg
          viewBox="0 0 300 44"
          preserveAspectRatio="none"
          className="block h-11 w-full overflow-visible"
        >
          {[
            "M150 0 C150 24 50 20 50 44",
            "M150 0 L150 44",
            "M150 0 C150 24 250 20 250 44",
          ].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              className="hero-flow stroke-brand-a"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="grid grid-cols-3 gap-3">
          {CLIPS.map((c, i) => (
            <div
              key={c.platform}
              className="hero-float overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xl shadow-[rgb(0_0_0/0.3)]"
              style={{ animationDelay: `${i * -1.6}s` }}
            >
              <div className="relative aspect-[9/14] overflow-hidden bg-zinc-900">
                <img
                  src={image}
                  alt=""
                  className="size-full object-cover"
                  style={{ objectPosition: c.crop }}
                />
                <span className="absolute left-1.5 top-1.5 rounded bg-[rgb(0_0_0/0.6)] px-1.5 py-0.5 font-mono text-[9px] text-[#fff] backdrop-blur">
                  {c.platform}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgb(0_0_0/0.8)] to-transparent px-2 pb-2 pt-6">
                  <p className="flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums text-[#fff]">
                    <Eye className="size-3" /> {compact(views[i])}
                  </p>
                </div>
              </div>
              <p className="bg-brand px-2 py-1.5 text-center font-mono text-[11px] font-semibold tabular-nums text-brand-ink">
                +{money((views[i] / 1000) * c.rate)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Views that keep climbing a little, like a clip taking off. Still when reduced motion is on. */
function useTicker(start: number[]): number[] {
  const [values, setValues] = useState(start);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setValues((v) => v.map((n) => n + Math.round(40 + Math.random() * 260)));
    }, 1400);
    return () => window.clearInterval(id);
  }, []);
  return values;
}
