// Landing page content, shared by the Next app and the standalone demo.
import { type LinkLike } from './views';
import { HeroFlow, WordTicker } from './hero-flow';
import { PlatformIcon } from './platform-icon';
import { HowItWorks } from './how-it-works';
import { Features } from './features';
import { LogoMark } from './logo';
import { buttonClass } from './ui/button';

export function Landing({
  link = 'a',
  startHref,
  clipperHref,
  feePercent,
  legal,
}: {
  link?: LinkLike;
  startHref: string;
  clipperHref: string;
  feePercent: number;
  /** Links to the privacy policy and terms, when the site has them. */
  legal?: { privacy: string; terms: string };
}) {
  const Link = link;
  return (
    <main className="gutter mx-auto max-w-6xl">
      <section className="relative isolate grid grid-cols-1 items-center gap-12 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-24">
        <div className="hero-grid pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10" aria-hidden />
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-600 backdrop-blur">
            <span className="hero-pulse size-1.5 rounded-full bg-brand-a" /> Clipping campaigns for streamers
          </p>
          <h1 className="balance mt-5 text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Your stream, <span className="text-brand">clipped everywhere.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Pin the moments worth clipping. Clippers post them to TikTok, YouTube Shorts and Instagram Reels, and you pay only for the views they get.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={startHref} className={buttonClass('primary', 'md', 'h-11 px-5')}>
              Get started
            </Link>
            <Link href={clipperHref} className={buttonClass('secondary', 'md', 'h-11 px-5')}>
              Browse campaigns
            </Link>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-[auto_auto_1fr] gap-x-6 border-t border-zinc-200/80 pt-5 font-mono sm:gap-x-10">
            {(
              [
                ['Paid on', 'real views'],
                ['Clippers keep', '100%'],
                [
                  'Platforms',
                  <span key="p" className="flex items-center gap-2.5 pt-0.5 text-zinc-700">
                    <PlatformIcon platform="tiktok" />
                    <PlatformIcon platform="youtube" />
                    <PlatformIcon platform="instagram" />
                  </span>,
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroFlow />
      </section>

      <WordTicker />

      <HowItWorks feePercent={feePercent} />

      <Features feePercent={feePercent} />

      <section className="flex flex-col items-center gap-5 border-t border-zinc-200/80 py-16 text-center">
        <LogoMark className="size-24" />
        <p className="text-2xl font-semibold tracking-tight">Atlas Clips</p>
        <Link href={startHref} className={buttonClass('primary', 'md', 'h-11 px-5')}>
          Get started
        </Link>
      </section>

      <footer className="flex flex-col gap-3 border-t border-zinc-200/80 py-8 text-xs text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          Atlas Clips
          {legal && (
            <>
              <Link href={legal.privacy} className="text-xs hover:text-zinc-900">
                Privacy
              </Link>
              <Link href={legal.terms} className="text-xs hover:text-zinc-900">
                Terms
              </Link>
            </>
          )}
        </span>
      </footer>
    </main>
  );
}
