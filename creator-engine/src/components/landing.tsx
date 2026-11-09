// Landing page content, shared by the Next app and the standalone demo.
import { type LinkLike } from './views';
import { HeroClip } from './hero-clip';
import { buttonClass } from './ui/button';
import credits from '../../public/demo/thumbs/credits.json';

const STEPS = {
  streamer: [
    ['Post a campaign', 'Set a rate per 1,000 views, a cap per clipper and the platforms you want. Fund it once, plus a {fee}% fee.'],
    ['Pin the moments', 'Drop timestamps from your stream. Each moment has a few slots so clippers spread out.'],
    ['Pay for real views', 'Views come straight from TikTok and YouTube. You only pay for what was watched.'],
  ],
  clipper: [
    ['Pick a campaign', 'See the rate, the budget left and what you would take home before you join.'],
    ['Claim and cut', 'Claim a moment, cut it your way, add your clip code and #ad to the caption.'],
    ['Get paid as it grows', 'Earnings update every few hours. You keep 100%, paid to your bank, PayPal or Venmo.'],
  ],
} as const;

const FEATURES = [
  ['Moment board', 'Streamers pin the moments worth clipping. Limited slots per moment keep feeds from filling with the same clip.'],
  ['Clip codes', 'Every clipper gets a code. Put it in the caption and the clip is yours on TikTok, Shorts or Reels. No account linking needed.'],
  ['Budget forecast', 'Each campaign shows how much is left and about how many days it will last at the current pace.'],
  ['Review window', 'Streamers pick a review deadline. Clean clips with #ad are approved automatically when it passes.'],
  ['No fees for clippers', 'Clippers keep 100% of what they earn. Streamers pay a flat {fee}% on top of their budget, shown before they pay.'],
  ['Fake views don’t get paid', 'Re-uploads are matched by image fingerprint and bot-like spikes freeze earnings until checked.'],
];

export function Landing({
  link = 'a',
  startHref,
  clipperHref,
  assetBase,
  feePercent,
  legal,
}: {
  link?: LinkLike;
  startHref: string;
  clipperHref: string;
  assetBase: string;
  feePercent: number;
  /** Links to the privacy policy and terms, when the site has them. */
  legal?: { privacy: string; terms: string };
}) {
  const withFee = (t: string) => t.replace('{fee}', String(feePercent));
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
            {[
              ['Paid on', 'real views'],
              ['Clippers keep', '100%'],
              ['Platforms', 'TikTok · YT · IG'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroClip stream={`${assetBase}stream-city.jpg`} cam={`${assetBase}facecam.jpg`} />
      </section>

      <section className="grid grid-cols-1 gap-6 border-t border-zinc-200/80 py-14 md:grid-cols-2">
        {(['streamer', 'clipper'] as const).map((who) => (
          <div key={who} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-card sm:p-7">
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{who === 'streamer' ? 'For streamers' : 'For clippers'}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{who === 'streamer' ? 'If you stream' : 'If you clip'}</h2>
            <ol className="mt-6 space-y-5">
              {STEPS[who].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand font-mono text-xs font-semibold text-brand-ink">0{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{withFee(body)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="border-t border-zinc-200/80 py-14">
        <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Under the hood</p>
        <h2 className="balance mt-1 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Made for clipping, not adapted from ad tools</h2>
        <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body], i) => (
            <div key={title} className="bg-white p-6 transition-colors hover:bg-zinc-50">
              <span className="font-mono text-[11px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
              <dt className="mt-3 font-semibold tracking-tight">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">{withFee(body)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-col gap-3 border-t border-zinc-200/80 py-8 text-xs text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          Creator Engine
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
        <details className="max-w-xl sm:text-right">
          <summary className="cursor-pointer">Photo credits</summary>
          <ul className="mt-2 space-y-1">
            {credits.map((c) => (
              <li key={c.file}>
                <a href={c.page} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 hover:text-zinc-900">
                  {c.title}
                </a>{' '}
                by {c.creator}, {c.license}
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </main>
  );
}
