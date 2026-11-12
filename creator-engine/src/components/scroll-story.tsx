'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Eye, Scissors, Upload, Wallet } from 'lucide-react';
import { PlatformIcon } from './platform-icon';
import { cn } from './ui/cn';

// Scroll story: the section pins to the screen while you scroll through it. One moment from a
// stream is cut into three vertical clips, they fly out to TikTok, Shorts and Reels, views count
// up and clippers get paid. When the animation is done the page scrolls on as normal.

const clamp = (n: number) => Math.min(1, Math.max(0, n));
/** 0→1 over [a, b] of the overall progress, eased. */
const seg = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n)));

const STEPS = [
  { icon: Upload, title: 'Share one moment', body: 'A business adds a stream, song or video and sets the pay.' },
  { icon: Scissors, title: 'Clippers cut it', body: 'Many clippers turn it into vertical clips, each their own take.' },
  { icon: Eye, title: 'Posted everywhere', body: 'The clips go out on TikTok, Shorts and Reels from real accounts.' },
  { icon: Wallet, title: 'Real views, real pay', body: 'Only verified views count, and clippers are paid for them.' },
];

const CLIPS = [
  { platform: 'tiktok' as const, x: 3, y: 47, rot: -7, views: 412_000 },
  { platform: 'youtube' as const, x: 36, y: 42, rot: 0, views: 1_240_000 },
  { platform: 'instagram' as const, x: 69, y: 47, rot: 7, views: 786_000 },
];

/** The "footage": an abstract glowing scene, shared by the source frame and the clips cut from it. */
const SCENE =
  'radial-gradient(circle at 50% 46%, rgb(var(--brand-a) / 0.95), transparent 7%), radial-gradient(ellipse at 50% 48%, rgb(var(--brand-b) / 0.45), transparent 38%), radial-gradient(ellipse at 18% 80%, rgb(var(--brand-a) / 0.22), transparent 40%), radial-gradient(ellipse at 85% 20%, rgb(var(--brand-b) / 0.25), transparent 35%), linear-gradient(160deg, #0b1a10, #050807 70%)';

export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      setP(1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      // A little dwell at the end, so the finished picture stays a moment before the page moves on.
      setP(travel > 0 ? clamp(-r.top / (travel * 0.9)) : 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const appear = seg(p, 0, 0.12);
  const cut = seg(p, 0.18, 0.38); // the cut line sweeps across
  const split = seg(p, 0.38, 0.6); // slices fly out into clips
  const count = seg(p, 0.6, 0.86); // views count up
  const pay = seg(p, 0.82, 0.96); // payout lands
  const step = p < 0.18 ? 0 : p < 0.38 ? 1 : p < 0.62 ? 2 : 3;
  const total = CLIPS.reduce((n, c) => n + c.views, 0) * count;

  return (
    <div ref={ref} className={still ? 'py-16' : 'h-[300vh]'}>
      <div className={cn('flex flex-col justify-center gap-6 overflow-hidden', !still && 'sticky top-0 h-[100svh] py-6')}>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-12">
          {/* Steps */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">How a moment travels</p>
            <h2 className="balance mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">One moment. Everywhere.</h2>
            <ol className="mt-5 space-y-1 sm:mt-7">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const on = i === step;
                return (
                  <li key={s.title} className={cn('relative flex gap-3 rounded-xl px-3 py-2.5 transition-all duration-500', on ? 'bg-brand-a/10' : 'opacity-45', !on && 'max-lg:hidden')}>
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-500', on ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold tracking-tight">{s.title}</span>
                      <span className="block text-sm text-zinc-500">{s.body}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {/* Progress through the story */}
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-100 sm:mx-3">
              <div className="h-full rounded-full bg-brand" style={{ width: `${p * 100}%` }} />
            </div>
          </div>

          {/* Stage */}
          <div className="relative mx-auto aspect-square w-full max-w-[min(520px,52svh)] lg:max-w-[min(560px,70svh)]" aria-hidden>
            <div className="pointer-events-none absolute inset-[-10%] rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--brand-b) / 0.14), transparent)' }} />

            {/* Source frame (16:9) */}
            <div
              className="absolute overflow-hidden rounded-2xl ring-1 ring-white/10"
              style={{ left: '8%', top: '6%', width: '84%', height: '47%', opacity: appear * mix(1, 0.18, split), transform: `scale(${mix(0.92, 1, appear)})`, background: SCENE, boxShadow: '0 30px 60px -30px rgb(0 0 0 / 0.8)' }}
            >
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#fff' }}>
                <span className="size-1.5 animate-pulse rounded-full bg-rose-500" /> Live
              </span>
              {/* Waveform */}
              <div className="absolute inset-x-6 bottom-4 flex h-8 items-end gap-[3px]">
                {Array.from({ length: 36 }, (_, i) => (
                  <span key={i} className="flex-1 rounded-full bg-brand-a/60" style={{ height: `${20 + 70 * Math.abs(Math.sin(i * 0.7 + p * 9))}%` }} />
                ))}
              </div>
              {/* Cut line */}
              <span className="absolute inset-y-0 w-0.5" style={{ left: `${cut * 100}%`, opacity: cut > 0 && cut < 1 ? 1 : 0, background: 'rgb(var(--brand-a))', boxShadow: '0 0 18px 4px rgb(var(--brand-a) / 0.7)' }} />
              {/* Slice guides left behind by the cut */}
              {[1, 2].map((k) => (
                <span key={k} className="absolute inset-y-0 w-px border-l border-dashed border-white/40" style={{ left: `${(k * 100) / 3}%`, opacity: cut >= k / 3 ? 1 - split : 0 }} />
              ))}
            </div>

            {/* Clips: start as thirds of the frame, fly out into vertical posts */}
            {CLIPS.map((c, i) => {
              const sx = 8 + (84 / 3) * i;
              const views = c.views * count;
              return (
                <div
                  key={c.platform}
                  className="absolute overflow-hidden rounded-2xl"
                  style={{
                    left: `${mix(sx, c.x, split)}%`,
                    top: `${mix(6, c.y, split)}%`,
                    width: `${mix(84 / 3, 28, split)}%`,
                    height: `${mix(47, 50, split)}%`,
                    opacity: split > 0 ? 1 : 0,
                    transform: `rotate(${c.rot * split}deg)`,
                    boxShadow: `0 24px 50px -24px rgb(0 0 0 / 0.9), 0 0 0 1px rgb(var(--brand-a) / ${0.15 + 0.35 * split})`,
                  }}
                >
                  <div className="absolute inset-0" style={{ background: SCENE, backgroundSize: `${mix(300, 160, split)}% 100%`, backgroundPosition: `${i * 50}% 50%` }} />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2" style={{ opacity: split, color: '#fff' }}>
                    <PlatformIcon platform={c.platform} className="size-3.5" />
                    <span className="h-1 w-6 rounded-full bg-white/40" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6" style={{ opacity: split, color: '#fff' }}>
                    <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums sm:text-xs">
                      <Eye className="size-3" /> {short(views)}
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/20">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${count * 100}%` }} />
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Total verified views */}
            <div
              className="absolute left-1/2 top-[6%] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-zinc-50/90 px-4 py-2 text-sm font-semibold tabular-nums shadow-card ring-1 ring-zinc-200/80 backdrop-blur"
              style={{ opacity: count, transform: `translate(-50%, ${mix(12, 0, count)}px)` }}
            >
              <BadgeCheck className="size-4 text-[rgb(var(--brand-ta))]" /> {short(total)} verified views
            </div>

            {/* Payout */}
            <div
              className="absolute bottom-[-2%] left-1/2 flex items-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-ink shadow-[0_12px_30px_-10px_rgb(var(--brand-b)/0.8)]"
              style={{ opacity: pay, transform: `translate(-50%, ${mix(16, 0, pay)}px) scale(${mix(0.9, 1, pay)})` }}
            >
              <Wallet className="size-4" /> ${Math.round(4876 * pay).toLocaleString()} paid to clippers
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
