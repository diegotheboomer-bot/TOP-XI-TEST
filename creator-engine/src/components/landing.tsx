// Landing page content, shared by the Next app and the standalone demo.
import { type LinkLike } from './views';
import { ViewsChartHero } from './views-chart-hero';
import { PlatformTile } from './platform-icon';
import { BadgeCheck, Gamepad2, Megaphone, Music, Percent, Radio, ShieldCheck } from 'lucide-react';
import { Features } from './features';
import { ClipperPitch } from './clipper-pitch';
import { Faq } from './faq';
import { LogoMark } from './logo';
import { buttonClass } from './ui/button';

const AUDIENCES: [React.ElementType, string, string][] = [
  [Radio, 'Streamers & creators', 'Your best moments, cut and posted every day.'],
  [Megaphone, 'Brands & companies', 'Product launches and ads, spread by real people.'],
  [Music, 'Musicians & labels', 'Get a new release into thousands of videos.'],
  [Gamepad2, 'Games & films', 'Trailers and gameplay, clipped for every feed.'],
];

const STEPS_OWNER: [string, string][] = [
  ['Set up a campaign', 'Add your content, rules and a pay rate per 1,000 views, per clip or as a pool.'],
  ['Clippers post', 'Clippers cut short videos and post them from their own TikTok, YouTube or Instagram.'],
  ['Approve and pay for views', 'You approve every clip. Payouts are automatic and only for verified views.'],
];

const STEPS_CLIPPER: [string, string][] = [
  ['Join a campaign', 'Free, no follower minimum. Pick what you like clipping.'],
  ['Post your clips', 'Post from your connected account and paste the link.'],
  ['Get paid and level up', 'Earn per 1,000 views. Higher tiers mean lower fees and faster pay.'],
];

export function Landing({
  link = 'a',
  startHref,
  clipperHref,
  clipperStartHref,
  feePercent,
  legal,
}: {
  link?: LinkLike;
  startHref: string;
  clipperHref: string;
  /** Sign-up with the clipper side picked. */
  clipperStartHref: string;
  feePercent: number;
  /** Links to the privacy policy and terms, when the site has them. */
  legal?: { privacy: string; terms: string };
}) {
  const Link = link;
  return (
    <main className="gutter mx-auto max-w-6xl">
      {/* Hero */}
      <section className="relative isolate pb-16 pt-14 text-center sm:pb-24 sm:pt-20">
        <div className="hero-grid pointer-events-none absolute inset-x-0 -top-16 bottom-0 -z-10" aria-hidden />
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur">
          <span className="hero-pulse size-1.5 rounded-full bg-brand-a" /> The clipping marketplace
        </p>
        <h1 className="balance mx-auto mt-6 max-w-4xl text-[3.25rem] font-semibold leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">
          Content in. <span className="text-brand">Views out.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          Fund a campaign and a network of clippers turns your streams, music, trailers or videos into TikToks, Shorts and Reels. You pay only for verified views.
        </p>
        <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3 sm:flex sm:max-w-none sm:justify-center">
          <Link href={startHref} className={buttonClass('primary', 'md', 'h-12 px-6')}>
            Launch a campaign
          </Link>
          <Link href={clipperStartHref} className={buttonClass('secondary', 'md', 'h-12 px-6')}>
            Start clipping
          </Link>
        </div>
        <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-600">
          {[
            [BadgeCheck, 'Verified views only'],
            [ShieldCheck, 'You approve every clip'],
            [Percent, 'Low fees'],
          ].map(([Icon, text]) => {
            const I = Icon as React.ElementType;
            return (
              <li key={text as string} className="flex items-center gap-2">
                <I className="size-4 shrink-0 text-[rgb(var(--brand-ta))]" />
                {text as string}
              </li>
            );
          })}
        </ul>
        <div className="mt-12 text-left sm:mt-16">
          <ViewsChartHero />
        </div>
      </section>

      {/* Platforms */}
      <section className="flex flex-col items-center gap-4 border-y border-zinc-200/80 py-8 sm:flex-row sm:justify-between">
        <p className="text-sm text-zinc-500">Clips go out on the platforms that matter</p>
        <div className="flex items-center gap-6 text-sm font-medium text-zinc-700">
          {(
            [
              ['tiktok', 'TikTok'],
              ['youtube', 'YouTube Shorts'],
              ['instagram', 'Instagram Reels'],
            ] as const
          ).map(([p, label]) => (
            <span key={p} className="flex items-center gap-2">
              <PlatformTile platform={p} className="size-7 rounded-lg" iconClassName="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Who it’s for</p>
        <h2 className="balance mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Anyone with content worth clipping</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {AUDIENCES.map(([Icon, title, body]) => (
            <div key={title} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
              <span className="platform-tile relative grid size-10 place-items-center overflow-hidden rounded-xl bg-brand text-brand-ink">
                <Icon className="relative size-5" />
              </span>
              <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="grid grid-cols-1 gap-6 border-t border-zinc-200/80 py-20 lg:grid-cols-2">
        {(
          [
            ['For campaign owners', STEPS_OWNER, startHref, 'Launch a campaign'],
            ['For clippers', STEPS_CLIPPER, clipperStartHref, 'Start clipping'],
          ] as const
        ).map(([title, steps, href, cta]) => (
          <div key={title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
            <ol className="mt-5 space-y-5">
              {steps.map(([t, b], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 font-mono text-sm font-semibold">{i + 1}</span>
                  <div>
                    <p className="font-semibold tracking-tight">{t}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link href={href} className={buttonClass('secondary', 'md', 'mt-6 h-10 w-full sm:w-auto')}>
              {cta}
            </Link>
          </div>
        ))}
      </section>

      <Features feePercent={feePercent} />

      <ClipperPitch link={Link} href={clipperStartHref} />

      <Faq />

      <section className="flex flex-col items-center gap-4 border-t border-zinc-200/80 py-20 text-center">
        <LogoMark className="size-14" />
        <h2 className="balance text-2xl font-semibold tracking-tight sm:text-3xl">Get your content clipped this week.</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href={startHref} className={buttonClass('primary', 'md', 'h-11 px-6')}>
            Launch a campaign
          </Link>
          <Link href={clipperHref} className={buttonClass('secondary', 'md', 'h-11 px-6')}>
            Browse campaigns
          </Link>
        </div>
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
