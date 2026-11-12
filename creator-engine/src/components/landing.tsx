// Landing page content, shared by the Next app and the standalone demo.
import type { MarketCampaign } from '@/lib/data';
import { MarketCard, type LinkLike } from './views';
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
    ['Get paid as it grows', 'Earnings update every few hours. You keep 100%, paid straight to your bank.'],
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

const base = (over: Partial<MarketCampaign>): MarketCampaign => ({
  id: 's', brand_id: '', title: '', payout_model: 'pure_cpm', escrow_balance: 0, base_payout: 0, cpm_rate: 0, cpm_cap: 0, cps_commission_pct: 0,
  code_prefix: '', pixel_id: null, asset_folder_url: null, status: 'active', created_at: '', thumbnail_url: null, cover_color: '#18181b',
  brief: null, requirements: [], auto_approve_hours: 48, platforms: ['tiktok', 'youtube', 'instagram'], brandName: '', creators: 0,
  budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null },
  ...over,
});

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
  const preview = [
    base({
      title: 'Ranked Grind Highlights', brandName: 'Marlow Kade', cpm_rate: 2, cpm_cap: 1500, thumbnail_url: `${assetBase}controller-blue.jpg`, creators: 6,
      budget: { deposited: 11_000, committed: 2_960, available: 8_040, usedShare: 0.27, daysLeft: 56 },
    }),
    base({
      title: 'World Record Attempts', brandName: 'Pixel Pilot', cpm_rate: 2.5, cpm_cap: 2000, thumbnail_url: `${assetBase}keyboard-dark.jpg`, creators: 1,
      budget: { deposited: 12_000, committed: 582, available: 11_418, usedShare: 0.05, daysLeft: null },
    }),
  ];

  return (
    <main className="gutter landing-shell mx-auto max-w-6xl">
      <section className="landing-hero relative grid grid-cols-1 items-center gap-12 overflow-hidden py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 min-w-0">
          <span className="landing-eyebrow"><span className="landing-live-dot" /> THE CREATOR GROWTH ENGINE</span>
          <h1 className="balance mt-6 text-5xl font-bold leading-[1.03] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Your best moments deserve <span className="landing-gradient-text">the whole internet.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Turn streams into viral moments. Launch a campaign, let creators do the clipping, and reward real views across TikTok, Shorts and Reels.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={startHref} className={buttonClass('primary')}>
              Launch a campaign <span aria-hidden="true">↗</span>
            </Link>
            <Link href={clipperHref} className={buttonClass('secondary')}>
              Explore campaigns <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-zinc-500"><span>✦ Performance-based payouts</span><span>✦ No fees for clippers</span><span>✦ Built for creators</span></div>
        </div>
        <div className="landing-showcase relative grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
          {preview.map((c, i) => (
            <div key={c.title} className={i === 1 ? 'hidden sm:block sm:translate-y-8' : undefined}>
              <MarketCard c={c} href={clipperHref} link={Link} />
            </div>
          ))}
        </div>
      </section>

      <section className="landing-process border-t border-zinc-200/80 py-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div><p className="landing-section-kicker">HOW IT WORKS</p><h2 className="balance mt-2 text-3xl font-bold tracking-tight sm:text-4xl">One platform. Two ways to win.</h2></div>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">Whether you create the moments or make them travel, there is a place for you here.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {(['streamer', 'clipper'] as const).map((who) => (
          <div key={who} className="landing-role-card rounded-3xl border border-zinc-200/80 bg-white/80 p-7 shadow-sm sm:p-9">
            <span className="landing-role-icon" aria-hidden="true">{who === 'streamer' ? '◉' : '✂'}</span>
            <h2 className="mt-5 text-xl font-bold tracking-tight">{who === 'streamer' ? 'If you stream' : 'If you clip'}</h2>
            <ol className="mt-5 space-y-5">
              {STEPS[who].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-xs font-semibold text-white">{i + 1}</span>
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

      <section className="border-t border-zinc-200/80 py-20">
        <p className="landing-section-kicker">WHY CREATOR ENGINE</p><h2 className="balance mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to turn attention into momentum.</h2>
        <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="landing-feature-card rounded-2xl border border-zinc-200/80 bg-white/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10">
              <dt className="font-semibold tracking-tight">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">{withFee(body)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="landing-cta my-10 rounded-[2rem] px-7 py-12 text-center sm:px-14 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-violet-200">Your next viral moment starts here</p>
        <h2 className="balance mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">Stop letting your best content disappear after the stream.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-violet-100/80 sm:text-base">Build a campaign or discover your next clip. The next big moment is one click away.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={startHref} className="landing-cta-button">Start creating ↗</Link><Link href={clipperHref} className="landing-cta-outline">Find campaigns →</Link></div>
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
