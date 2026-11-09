// Landing page content, shared by the Next app and the standalone demo.
import type { MarketCampaign } from '@/lib/data';
import { MarketCard, type LinkLike } from './views';
import { buttonClass } from './ui/button';
import credits from '../../public/demo/thumbs/credits.json';

const STEPS = {
  streamer: [
    ['Post a campaign', 'Set a rate per 1,000 views, a cap per clipper and the platforms you want. Fund it once.'],
    ['Pin the moments', 'Drop timestamps from your stream. Each moment has a few slots so clippers spread out.'],
    ['Pay for real views', 'Views come straight from TikTok and YouTube. You only pay for what was watched.'],
  ],
  clipper: [
    ['Pick a campaign', 'See the rate, the budget left and what you would take home before you join.'],
    ['Claim and cut', 'Claim a moment, cut it your way, add your clip code and #ad to the caption.'],
    ['Get paid as it grows', 'Earnings update every few hours. Payouts go straight to your bank.'],
  ],
} as const;

const FEATURES = [
  ['Moment board', 'Streamers pin the moments worth clipping. Limited slots per moment keep feeds from filling with the same clip.'],
  ['Clip codes', 'Every clipper gets a code. Put it in the caption and the clip is yours on TikTok, Shorts or Reels. No account linking needed.'],
  ['Budget forecast', 'Each campaign shows how much is left and about how many days it will last at the current pace.'],
  ['Review window', 'Streamers pick a review deadline. Clean clips with #ad are approved automatically when it passes.'],
  ['Merch that pays clippers', 'The same clip code works as a discount at the streamer’s store, and can earn the clipper a cut.'],
  ['Fake views don’t get paid', 'Re-uploads are matched by image fingerprint and bot-like spikes freeze earnings until checked.'],
];

const base = (over: Partial<MarketCampaign>): MarketCampaign => ({
  id: 's', brand_id: '', title: '', payout_model: 'pure_cpm', escrow_balance: 0, base_payout: 0, cpm_rate: 0, cpm_cap: 0, cps_commission_pct: 0,
  code_prefix: '', pixel_id: null, asset_folder_url: null, status: 'active', created_at: '', thumbnail_url: null, cover_color: '#18181b',
  brief: null, requirements: [], auto_approve_hours: 48, platforms: ['tiktok', 'youtube', 'instagram'], brandName: '', creators: 0,
  budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null },
  ...over,
});

export function Landing({ link = 'a', startHref, clipperHref, assetBase }: { link?: LinkLike; startHref: string; clipperHref: string; assetBase: string }) {
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
    <main className="gutter mx-auto max-w-6xl">
      <section className="grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0">
          <p className="text-sm font-medium text-accent-700">For streamers and the clippers who grow them</p>
          <h1 className="balance mt-3 text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl">Your stream, clipped everywhere.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Post a campaign, pin the moments worth clipping, and pay clippers only for the views their clips get on TikTok, YouTube Shorts and Instagram Reels.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={startHref} className={buttonClass('primary')}>
              Get started
            </Link>
            <Link href={clipperHref} className={buttonClass('secondary')}>
              Browse campaigns
            </Link>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
          {preview.map((c, i) => (
            <div key={c.title} className={i === 1 ? 'hidden sm:block sm:translate-y-8' : undefined}>
              <MarketCard c={c} href={clipperHref} link={Link} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 border-t border-zinc-200/80 py-14 md:grid-cols-2">
        {(['streamer', 'clipper'] as const).map((who) => (
          <div key={who}>
            <h2 className="text-lg font-semibold tracking-tight">{who === 'streamer' ? 'If you stream' : 'If you clip'}</h2>
            <ol className="mt-5 space-y-5">
              {STEPS[who].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-xs font-semibold text-white">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="border-t border-zinc-200/80 py-14">
        <h2 className="balance max-w-xl text-2xl font-semibold tracking-tight">Made for clipping, not adapted from ad tools</h2>
        <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, body]) => (
            <div key={title} className="border-t border-zinc-200/80 pt-4">
              <dt className="font-semibold tracking-tight">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="flex flex-col gap-3 border-t border-zinc-200/80 py-8 text-xs text-zinc-500 sm:flex-row sm:items-start sm:justify-between">
        <span className="text-sm">Creator Engine</span>
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
