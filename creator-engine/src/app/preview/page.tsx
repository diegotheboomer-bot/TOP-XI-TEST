import type { Metadata } from 'next';
import { Award, BadgeCheck, Crown, Eye, Flame, Gem, Medal, Moon, Percent, Play, ShieldCheck, Shield, Sparkle, Star, Sun, Trophy } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { HeroFlow } from '@/components/hero-flow';
import { PlatformTile } from '@/components/platform-icon';
import { TierEmblem } from '@/components/tier-badge';
import { TIERS, TIER_LABEL } from '@/lib/tiers';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Design options', robots: { index: false } };

/** Rank chevrons: one to four stacked marks, like military ranks. */
function chevrons(n: number) {
  return function Chevrons({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {Array.from({ length: n }, (_, i) => {
          const y = 16 - (n - 1) * 2.5 + i * 5 - (n - 1) * 1.2;
          return <path key={i} d={`M5 ${y} l7 -5 l7 5`} />;
        })}
      </svg>
    );
  };
}

const SETS: { name: string; note: string; icons: React.ElementType[] }[] = [
  { name: 'A · Current', note: 'Shield, star, medal, gem, crown', icons: [Shield, Star, Medal, Gem, Crown] },
  { name: 'B · Ranks', note: 'Chevrons that stack up like military ranks', icons: [chevrons(1), chevrons(2), chevrons(3), chevrons(4), Crown] },
  { name: 'C · Celestial', note: 'Moon, sun, spark, gem, crown', icons: [Moon, Sun, Sparkle, Gem, Crown] },
  { name: 'D · Trophy room', note: 'Award, medal, trophy, gem, flame', icons: [Award, Medal, Trophy, Gem, Flame] },
];

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-200/80 py-14">
      <p className="mb-8 inline-flex rounded-full bg-brand px-3 py-1 text-xs font-bold text-brand-ink">{label}</p>
      {children}
    </section>
  );
}

const PHONES = [
  ['Clutch 1v4 in ranked', '1.2M', '$2,400'],
  ['New single, 15s hook', '486K', '$972'],
  ['Trailer reaction', '310K', '$620'],
];

/** Design options to choose from: home page heroes and tier symbols. Not linked from the site. */
export default function PreviewPage() {
  return (
    <>
      <SiteHeader />
      <main className="gutter mx-auto max-w-6xl pb-24">
        <h1 className="pt-10 text-3xl font-semibold tracking-tight">Design options</h1>
        <p className="mt-1 text-zinc-500">Pick a home page hero (1, 2 or 3) and a tier symbol set (A–D).</p>

        <Variant label="Home option 1 · Bold and centered">
          <div className="text-center">
            <h2 className="balance mx-auto max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              Content in. <span className="text-brand">Views out.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600">Fund a campaign and a network of clippers posts your content across TikTok, Shorts and Reels. Pay only for verified views.</p>
            <div className="mt-8 flex justify-center gap-3">
              <span className={buttonClass('primary', 'md', 'h-12 px-6')}>Launch a campaign</span>
              <span className={buttonClass('secondary', 'md', 'h-12 px-6')}>Start clipping</span>
            </div>
            <div className="mx-auto mt-12 max-w-xl text-left">
              <HeroFlow />
            </div>
          </div>
        </Variant>

        <Variant label="Home option 2 · Phone feed">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="balance text-5xl font-semibold leading-[1.04] tracking-tight">
                Your content, <span className="text-brand">in every feed.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg text-zinc-600">Clippers turn streams, songs and trailers into short videos. You approve each one and pay per 1,000 real views.</p>
              <div className="mt-8 flex gap-3">
                <span className={buttonClass('primary', 'md', 'h-12 px-6')}>Launch a campaign</span>
                <span className={buttonClass('secondary', 'md', 'h-12 px-6')}>Start clipping</span>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              {PHONES.map(([t, v, e], i) => (
                <div key={t} className="relative aspect-[9/19] w-32 overflow-hidden rounded-[1.6rem] border-4 border-zinc-900 shadow-xl sm:w-40" style={{ background: 'linear-gradient(160deg, #0c0f0b, #14532d)', transform: `translateY(${i === 1 ? -24 : 0}px)` }}>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                      <Play className="size-4 fill-current" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2.5" style={{ color: '#fff' }}>
                    <p className="text-[10px] font-semibold leading-tight">{t}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      <Eye className="size-3" /> {v}
                    </p>
                    <p className="mt-1.5 rounded-full bg-brand px-2 py-0.5 text-center text-[10px] font-bold text-brand-ink">earned {e}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Variant>

        <Variant label="Home option 3 · Editorial with numbers">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">The clipping marketplace</p>
            <h2 className="balance mt-3 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              The fastest way to get your content <span className="text-brand">clipped, posted and seen.</span>
            </h2>
            <div className="mt-8 flex gap-3">
              <span className={buttonClass('primary', 'md', 'h-12 px-6')}>Launch a campaign</span>
              <span className={buttonClass('secondary', 'md', 'h-12 px-6')}>Start clipping</span>
            </div>
            <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-4">
              {[
                [BadgeCheck, 'Verified views', 'only real views are paid'],
                [ShieldCheck, 'You approve', 'every clip, by hand'],
                [Percent, 'No service fee', 'for early partners'],
                [Play, '3 platforms', 'TikTok, Shorts, Reels'],
              ].map(([I, k, v]) => {
                const Icon = I as React.ElementType;
                return (
                  <div key={k as string} className="bg-white p-5">
                    <Icon className="size-5 text-[rgb(var(--brand-ta))]" />
                    <dt className="mt-3 font-semibold">{k as string}</dt>
                    <dd className="text-sm text-zinc-500">{v as string}</dd>
                  </div>
                );
              })}
            </dl>
            <div className="mt-6 flex items-center gap-3 text-sm text-zinc-500">
              <PlatformTile platform="tiktok" className="size-7 rounded-lg" iconClassName="size-3.5" />
              <PlatformTile platform="youtube" className="size-7 rounded-lg" iconClassName="size-3.5" />
              <PlatformTile platform="instagram" className="size-7 rounded-lg" iconClassName="size-3.5" />
            </div>
          </div>
        </Variant>

        <section className="border-t border-zinc-200/80 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Tier symbols</h2>
          <p className="mt-1 text-sm text-zinc-500">Same colours, different symbols.</p>
          <div className="mt-8 space-y-10">
            {SETS.map((set) => (
              <div key={set.name}>
                <p className="font-semibold">{set.name}</p>
                <p className="text-sm text-zinc-500">{set.note}</p>
                <div className="mt-4 flex flex-wrap gap-6">
                  {TIERS.map((t, i) => (
                    <div key={t} className="flex flex-col items-center gap-2">
                      <TierEmblem tier={t} size={68} icon={set.icons[i]} />
                      <span className="text-xs text-zinc-500">{TIER_LABEL[t]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
