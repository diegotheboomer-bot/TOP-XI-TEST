'use client';

// "Get paid to clip": the pitch to clippers, with a views → earnings slider.
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { PlatformTile } from './platform-icon';

const RATE = 2; // example $ per 1K views; each campaign sets its own
const STEPS = [5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `${Math.round(n / 1000)}K`);

const POINTS = [
  'Free to join, and you keep 100% of what you earn.',
  'No follower minimum. Views are what count.',
  'Rate and cap shown before you join.',
  'Post on TikTok, YouTube Shorts or Instagram Reels.',
  'Clips keep earning while they get views.',
  'Paid automatically to your bank, PayPal or Venmo.',
];

/** Tween a number to its new value with a quick overshoot, so the slider feels springy. */
function useSpring(target: number, ms = 450): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const c = 1.6; // easeOutBack: slight overshoot, then settle
      const e = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
      const v = a + (target - a) * e;
      from.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function ClipperPitch({ link: Link = 'a', href }: { link?: React.ElementType; href: string }) {
  const [i, setI] = useState(4);
  const views = useSpring(STEPS[i]);
  const earned = Math.max(0, (views / 1000) * RATE);
  const pct = (i / (STEPS.length - 1)) * 100;
  return (
    <section className="border-t border-zinc-200/80 py-16 sm:py-20">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">For clippers</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Get paid to <span className="text-brand">clip streams.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600">
            Pick a campaign, post clips from your own account, and earn for every 1,000 views. Clips keep earning while they get views.
          </p>
          <ul className="mt-6 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Link href={href} className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-brand-ink transition hover:brightness-110 sm:w-auto">
            Start clipping
          </Link>
        </div>

        {/* Earnings estimate */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">If your clip gets</p>
            <span className="flex gap-1.5">
              <PlatformTile platform="tiktok" className="size-6 rounded-md" iconClassName="size-3" />
              <PlatformTile platform="youtube" className="size-6 rounded-md" iconClassName="size-3" />
              <PlatformTile platform="instagram" className="size-6 rounded-md" iconClassName="size-3" />
            </span>
          </div>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{compact(Math.max(0, views))} views</p>
          <input
            type="range"
            min={0}
            max={STEPS.length - 1}
            value={i}
            onChange={(e) => setI(Number(e.target.value))}
            aria-label="Views"
            aria-valuetext={`${compact(STEPS[i])} views`}
            className="snap-range mt-7 w-full"
            style={{ '--p': `${pct}%` } as React.CSSProperties}
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-400">
            <span>5K</span>
            <span>1M</span>
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-zinc-200/80 pt-5">
            <p className="text-sm text-zinc-500">you’d earn</p>
            <p key={i} className="snap-pop text-4xl font-semibold tabular-nums tracking-tight text-brand">${Math.round(earned).toLocaleString('en-US')}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            At ${RATE.toFixed(2)} per 1K views. Each campaign sets its own rate and a cap per clipper, shown before you join.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            Example only, not a promise. Most clips get far fewer views, and earnings depend on the views your clips actually get.
          </p>
        </div>
      </div>
    </section>
  );
}
