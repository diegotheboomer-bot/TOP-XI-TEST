// Landing page content, shared by the Next app and the standalone demo.
import type { MarketCampaign } from '@/lib/data';
import { MarketCard, type LinkLike } from './views';
import { buttonClass } from './ui/button';

const DIFFERENTIATORS = [
  ['Budget you can see', 'Every campaign shows how much budget is left and roughly how many days it will last, so creators never post into an empty pool.'],
  ['Reviews that don’t stall', 'Brands set a review window. Clean videos that carry #ad are approved automatically when it runs out.'],
  ['Disclosure built in', 'Captions are checked for #ad on every sync, so sponsored posts stay compliant without manual policing.'],
  ['Paid on sales, not just views', 'Each creator gets a personal code and link. Orders are matched server-side and can pay a commission.'],
  ['Fraud caught before payout', 'Re-uploads are matched by perceptual hash, and bot-like view spikes freeze earnings until reviewed.'],
  ['One payout, fee shown up front', 'Brands fund escrow once. Creators see their take-home after the platform fee before they join.'],
];

const sample = (over: Partial<MarketCampaign>): MarketCampaign => ({
  id: 's',
  brand_id: '',
  title: '',
  payout_model: 'pure_cpm',
  escrow_balance: 0,
  base_payout: 0,
  cpm_rate: 0,
  cpm_cap: 0,
  cps_commission_pct: 0,
  code_prefix: '',
  pixel_id: null,
  asset_folder_url: null,
  status: 'active',
  created_at: '',
  thumbnail_url: null,
  cover_color: '#18181b',
  brief: null,
  requirements: [],
  auto_approve_hours: 48,
  brandName: '',
  creators: 0,
  budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null },
  ...over,
});

const PREVIEW = [
  sample({
    title: 'Voltline Zero Launch', brandName: 'Voltline Energy', payout_model: 'hybrid', base_payout: 500, cpm_rate: 4, cpm_cap: 5000, cover_color: '#0e2a47', creators: 6,
    budget: { deposited: 39_000, committed: 14_300, available: 24_700, usedShare: 0.37, daysLeft: 34 },
  }),
  sample({
    title: 'Desk Setup Tour', brandName: 'Pixelforge Peripherals', cpm_rate: 3, cpm_cap: 2000, cover_color: '#16403a', creators: 1,
    budget: { deposited: 18_000, committed: 700, available: 17_300, usedShare: 0.04, daysLeft: null },
  }),
];

export function Landing({ link = 'a', brandHref, creatorHref }: { link?: LinkLike; brandHref: string; creatorHref: string }) {
  const Link = link;
  return (
    <main className="gutter mx-auto max-w-6xl">
      <section className="grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0">
          <p className="text-sm font-medium text-accent-700">Creator campaigns, paid on proof</p>
          <h1 className="balance mt-3 text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl">Pay creators for the views and sales they actually drive.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Brands fund a campaign once. Creators join, post, and get paid from escrow as TikTok confirms their views and your store confirms their sales.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={brandHref} className={buttonClass('primary')}>
              I’m a brand
            </Link>
            <Link href={creatorHref} className={buttonClass('secondary')}>
              I’m a creator
            </Link>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
          {PREVIEW.map((c, i) => (
            <div key={c.title} className={i === 1 ? 'hidden sm:block sm:translate-y-8' : undefined}>
              <MarketCard c={c} href={creatorHref} link={Link} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-10 border-t border-zinc-200/80 py-14 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <h2 className="balance text-2xl font-semibold tracking-tight">Built around what goes wrong on other platforms</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">Clippers complain about slow approvals and budgets that run dry without warning. Brands worry about bots and undisclosed ads.</p>
        </div>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
          {DIFFERENTIATORS.map(([title, body]) => (
            <div key={title} className="border-t border-zinc-200/80 pt-4">
              <dt className="font-semibold tracking-tight">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">{body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
