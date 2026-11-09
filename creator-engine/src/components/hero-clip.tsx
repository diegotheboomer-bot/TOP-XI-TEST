'use client';

// Landing hero visual: a live game stream with a facecam, a spike in chat that
// gets pinned as a moment, and that moment posted as three vertical clips
// (facecam on top, gameplay below) whose views and earnings tick up.
// Decorative only (aria-hidden); every name and number is illustrative.
import { useEffect, useState } from 'react';
import { Eye, Forward, Heart, MessageCircle, MessageCircleMore, MessageSquareText, Music2, Plus, Send, ThumbsDown, ThumbsUp } from 'lucide-react';

// Chat activity per slice of the stream; the spike is the moment that gets clipped.
const BARS = [3, 4, 3, 5, 4, 6, 5, 4, 3, 4, 5, 4, 6, 7, 5, 4, 5, 6, 8, 11, 14, 16, 15, 13, 10, 7, 6, 5, 4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 4, 3];
const MOMENT = { from: 18, to: 26 };
const RATE = 2; // $ per 1K views

// Each clip is styled like its platform. Handles are the demo's fictional clippers.
const CLIPS = [
  // `game` and `face` frame each clip differently: where it's cropped and how far it's zoomed (or mirrored).
  { platform: 'tiktok', handle: '@clipsbyrae', game: { at: '18% 72%', zoom: 'scale(1.6)' }, face: { at: '45% 45%', zoom: 'scale(1.35)' }, caption: '1v3 clutch', views: 48_200, likes: '4.1K', tilt: '-rotate-[5deg] translate-y-3' },
  { platform: 'shorts', handle: '@vodvault', game: { at: '55% 62%', zoom: 'none' }, face: { at: '50% 30%', zoom: 'none' }, caption: 'never saw it', views: 21_900, likes: '1.8K', tilt: 'z-10 -translate-y-1 sm:scale-[1.04]' },
  { platform: 'reels', handle: '@framejump', game: { at: '88% 80%', zoom: 'scale(1.8)' }, face: { at: '40% 40%', zoom: 'scaleX(-1) scale(1.15)' }, caption: 'chat went crazy', views: 33_400, likes: '2.6K', tilt: 'rotate-[5deg] translate-y-3' },
] as const;
type Clip = (typeof CLIPS)[number];

// Platform touches: caption style and progress bar colour.
const CAPTION: Record<Clip['platform'], { className: string; style?: React.CSSProperties }> = {
  tiktok: { className: 'text-[#fff]', style: { textShadow: '1.5px 0 0 #fe2c55, -1.5px 0 0 #25f4ee, 0 2px 6px rgb(0 0 0 / 0.8)' } },
  shorts: { className: 'rounded-sm bg-[#facc15] px-1 text-[#111]', style: { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } },
  reels: { className: 'rounded-full bg-[#fff] px-2 py-0.5 normal-case text-[#111]' },
};
const PROGRESS: Record<Clip['platform'], string> = {
  tiktok: 'linear-gradient(90deg, #25f4ee, #fe2c55)',
  shorts: '#ff0033',
  reels: 'linear-gradient(90deg, #f58529, #dd2a7b, #8134af)',
};

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
      <div className="mx-auto px-4 sm:w-[72%] sm:px-0">
        <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="block h-10 w-full overflow-visible">
          {['M150 0 C150 22 50 18 50 40', 'M150 0 L150 40', 'M150 0 C150 22 250 18 250 40'].map((d) => (
            <path key={d} d={d} fill="none" className="hero-flow stroke-brand-a" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="grid grid-cols-3 gap-2 pb-3 pt-2 sm:gap-4">
          {CLIPS.map((c, i) => (
            <div key={c.platform} className={`relative ${c.tilt}`}>
              <div className="hero-float relative" style={{ animationDelay: `${i * -1.6}s` }}>
                <Phone clip={c} cam={cam} stream={stream} delay={i} />
                {/* "+$" bubble on the phone's corner each time its views jump */}
                {deltas[i] > 0 && (
                  <span
                    key={views[i]}
                    className="hero-pop absolute -right-0.5 -top-2 z-20 sm:-right-1.5 rounded-full bg-brand px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-brand-ink shadow-lg shadow-[rgb(0_0_0/0.35)]"
                  >
                    +{money(earned(deltas[i]))}
                  </span>
                )}
                {/* Views and earnings */}
                <div className="mx-auto mt-2.5 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-2.5 py-1 shadow-md shadow-[rgb(0_0_0/0.15)]">
                  <span className="hidden items-center gap-0.5 font-mono text-[10px] tabular-nums text-zinc-500 sm:flex">
                    <Eye className="size-3" /> {compact(views[i])}
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-[13px]">{money(earned(views[i]))}</span>
                </div>
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

/** A phone playing the clip, with its platform's look. */
function Phone({ clip: c, cam, stream, delay }: { clip: Clip; cam: string; stream: string; delay: number }) {
  const caption = CAPTION[c.platform];
  return (
    <div className="rounded-[1.35rem] bg-[#0b0b10] p-[3px] shadow-2xl shadow-[rgb(0_0_0/0.45)] ring-1 ring-[rgb(255_255_255/0.12)]">
      <div className={`relative aspect-[9/16] overflow-hidden rounded-[1.15rem] bg-[#0b0b10] font-sans ${WHITE}`}>
        {/* Facecam on top, gameplay below */}
        <div className="absolute inset-x-0 top-0 h-[36%] overflow-hidden">
          <img src={cam} alt="" className="size-full object-cover" style={{ objectPosition: c.face.at, transform: c.face.zoom, transformOrigin: c.face.at }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[64%] overflow-hidden">
          <img src={stream} alt="" className="size-full object-cover" style={{ objectPosition: c.game.at, transform: c.game.zoom, transformOrigin: c.game.at }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgb(0_0_0/0.75)] to-transparent" />

        {/* Camera notch */}
        <span className="absolute left-1/2 top-1.5 z-10 h-2 w-7 -translate-x-1/2 rounded-full bg-[#000]" />

        {/* Caption on the seam */}
        <span className="absolute inset-x-1 top-[36%] -translate-y-1/2 text-center leading-snug">
          <span className={`whitespace-nowrap text-[9px] font-black uppercase sm:text-[11px] ${caption.className}`} style={caption.style}>
            {c.caption}
          </span>
        </span>

        {c.platform === 'tiktok' && <TikTokUi clip={c} cam={cam} />}
        {c.platform === 'shorts' && <ShortsUi clip={c} cam={cam} />}
        {c.platform === 'reels' && <ReelsUi clip={c} cam={cam} />}

        {/* Playback progress */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[rgb(255_255_255/0.25)]">
          <div className="hero-progress h-full" style={{ background: PROGRESS[c.platform], animationDelay: `${delay * -2.3}s` }} />
        </div>
      </div>
    </div>
  );
}

const TEXT_SHADOW = { textShadow: '0 1px 2px rgb(0 0 0 / 0.7)' };
const ICON = 'size-[11px] sm:size-3.5';

/**
 * Bottom of a clip like the real apps: text on the left, the action column on
 * the right, side by side so they never overlap. Starts below the caption seam.
 */
function Overlay({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-[44%] flex items-end gap-1 px-1.5 pb-2 sm:px-2 sm:pb-2.5" style={TEXT_SHADOW}>
      <div className="min-w-0 flex-1 space-y-px">{children}</div>
      <div className="flex shrink-0 flex-col items-center gap-1 text-[6px] font-semibold sm:gap-1.5 sm:text-[7px]">{rail}</div>
    </div>
  );
}

function Avatar({ cam, className = '' }: { cam: string; className?: string }) {
  return <img src={cam} alt="" className={`size-3.5 shrink-0 rounded-full object-cover sm:size-4 ${className}`} style={{ objectPosition: '45% 40%' }} />;
}

function Stat({ icon, label }: { icon: React.ReactNode; label?: string }) {
  return (
    <span className="flex flex-col items-center gap-px leading-none">
      {icon}
      {label}
    </span>
  );
}

/** TikTok: Following | For You tabs, avatar with +, heart, comments and the spinning sound disc. */
function TikTokUi({ clip: c, cam }: { clip: Clip; cam: string }) {
  return (
    <>
      <div className="absolute inset-x-0 top-4 flex justify-center gap-2 text-[7px] font-semibold sm:text-[8px]" style={TEXT_SHADOW}>
        <span className="opacity-70">Following</span>
        <span className="border-b border-[#fff] pb-px">For You</span>
      </div>
      <Overlay
        rail={
          <>
            <span className="relative mb-0.5">
              <Avatar cam={cam} className="ring-1 ring-[#fff]" />
              <span className="absolute -bottom-1 left-1/2 grid size-2 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55]">
                <Plus className="size-1.5" strokeWidth={4} />
              </span>
            </span>
            <Stat icon={<Heart className={`${ICON} fill-[#fff]`} />} label={c.likes} />
            <Stat icon={<MessageCircleMore className={`${ICON} fill-[#fff] text-[#111]`} />} label="212" />
            <span className="hero-spin grid size-3.5 place-items-center rounded-full bg-[#222] ring-2 ring-[#333] sm:size-4">
              <Avatar cam={cam} className="!size-1.5 sm:!size-2" />
            </span>
          </>
        }
      >
        <p className="truncate text-[8px] font-bold sm:text-[9px]">{c.handle}</p>
        <p className="truncate text-[7px] sm:text-[8px]">no way he hit that #fyp</p>
        <p className="flex items-center gap-0.5 truncate text-[7px] sm:text-[8px]">
          <Music2 className="size-2 shrink-0" /> original sound
        </p>
      </Overlay>
    </>
  );
}

/** YouTube Shorts: like and dislike, comments, share; channel row with Subscribe under the title. */
function ShortsUi({ clip: c, cam }: { clip: Clip; cam: string }) {
  return (
    <Overlay
      rail={
        <>
          <Stat icon={<ThumbsUp className={`${ICON} fill-[#fff]`} />} label={c.likes} />
          <Stat icon={<ThumbsDown className={ICON} />} />
          <Stat icon={<MessageSquareText className={ICON} />} label="96" />
          <Stat icon={<Forward className={`${ICON} fill-[#fff]`} />} />
        </>
      }
    >
      <p className="truncate text-[7px] font-medium sm:text-[8px]">He did NOT see that coming</p>
      <div className="flex min-w-0 items-center gap-1 pt-0.5">
        <Avatar cam={cam} />
        <span className="min-w-0 truncate text-[7px] font-semibold sm:text-[8px]">{c.handle}</span>
      </div>
      <span className="mt-0.5 inline-block rounded-full bg-[#fff] px-1.5 py-px text-[6px] font-bold text-[#0f0f0f] sm:text-[7px]">Subscribe</span>
    </Overlay>
  );
}

/** Instagram Reels: "Reels" title, heart, comment, send, the audio square; avatar row with Follow. */
function ReelsUi({ clip: c, cam }: { clip: Clip; cam: string }) {
  return (
    <>
      <span className="absolute left-2 top-4 text-[9px] font-bold sm:text-[11px]" style={TEXT_SHADOW}>
        Reels
      </span>
      <Overlay
        rail={
          <>
            <Stat icon={<Heart className={ICON} />} label={c.likes} />
            <Stat icon={<MessageCircle className={`${ICON} -scale-x-100`} />} label="118" />
            <Stat icon={<Send className={ICON} />} label="64" />
            <img src={cam} alt="" className="size-3.5 rounded-[3px] object-cover ring-1 ring-[#fff] sm:size-4" />
          </>
        }
      >
        <div className="flex min-w-0 items-center gap-1">
          <Avatar cam={cam} />
          <span className="min-w-0 truncate text-[7px] font-semibold sm:text-[8px]">{c.handle.slice(1)}</span>
        </div>
        <span className="mt-0.5 inline-block rounded border border-[#fff] px-1 text-[6px] font-semibold leading-3 sm:text-[7px]">Follow</span>
        <p className="flex items-center gap-0.5 truncate text-[7px] sm:text-[8px]">
          <Music2 className="size-2 shrink-0" /> Original audio
        </p>
      </Overlay>
    </>
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
