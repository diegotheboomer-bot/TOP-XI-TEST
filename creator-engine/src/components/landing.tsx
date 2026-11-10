// Landing page content, shared by the Next app and the standalone demo.
import { type LinkLike } from './views';
import { HeroFlow } from './hero-flow';
import { PlatformTile } from './platform-icon';
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
      <section className="relative isolate grid grid-cols-1 items-center gap-12 pb-20 pt-12 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28">
        <div className="hero-grid pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10" aria-hidden />
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-600 backdrop-blur">
            <span className="hero-pulse size-1.5 rounded-full bg-brand-a" /> Clipping campaigns for streamers
          </p>
          <h1 className="balance mt-5 text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Your stream, <span className="text-brand">clipped everywhere.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Pin your best moments. Clippers post them everywhere. You only pay for real views.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={startHref} className={buttonClass('primary', 'md', 'h-11 px-5')}>
              Get started
            </Link>
            <Link href={clipperHref} className={buttonClass('secondary', 'md', 'h-11 px-5')}>
              Browse campaigns
            </Link>
          </div>
          <p className="mt-8 flex items-center gap-3 text-sm text-zinc-500">
            Works with
            <span className="flex items-center gap-2">
              <PlatformTile platform="tiktok" className="size-7 rounded-lg" iconClassName="size-3.5" />
              <PlatformTile platform="youtube" className="size-7 rounded-lg" iconClassName="size-3.5" />
              <PlatformTile platform="instagram" className="size-7 rounded-lg" iconClassName="size-3.5" />
            </span>
          </p>
        </div>
        <HeroFlow />
      </section>

      <HowItWorks feePercent={feePercent} />

      <Features feePercent={feePercent} />

      <section className="flex flex-col items-center gap-4 border-t border-zinc-200/80 py-20 text-center">
        <LogoMark className="size-14" />
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Get clipped this week.</h2>
        <Link href={startHref} className={buttonClass('primary', 'md', 'mt-2 h-11 px-6')}>
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
