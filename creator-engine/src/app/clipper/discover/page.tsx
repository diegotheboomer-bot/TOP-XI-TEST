import Link from 'next/link';
import { ArrowRight, Compass, Flame, Sparkles, Timer, TrendingUp } from 'lucide-react';
import { getCreatorDashboard, type MarketCampaign } from '@/lib/data';
import { rateParts, usdCompact } from '@/lib/format';
import { rateFor } from '@/lib/payout';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { CampaignCover, MarketCard, StreamerAvatar, VerifiedMark } from '@/components/views';
import { CATEGORIES, CONTENT_TYPES } from '@/lib/campaign-tags';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

type Search = { category?: string; type?: string };

const POST_TO_PLATFORM: Record<string, string> = { 'post:TikTok': 'tiktok', 'post:YouTube Shorts': 'youtube', 'post:Instagram Reels': 'instagram' };

/** How well a campaign fits what the clipper told us: their topics and the platforms they post on. */
function fit(c: MarketCampaign, interests: string[]): number {
  let score = 0;
  if (c.category && interests.includes(c.category)) score += 3;
  for (const i of interests) if (POST_TO_PLATFORM[i] && c.platforms.includes(POST_TO_PLATFORM[i] as never)) score += 1;
  return score;
}

/** Best rate a clipper can get on the campaign (per 1K views or per clip), for sorting. */
const payScore = (c: MarketCampaign) => (c.payout_model === 'per_post' ? c.base_payout / 2 : Math.max(...c.platforms.map((p) => rateFor(c, p)), c.cpm_rate));

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
        on ? 'border-transparent bg-brand text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
      )}
    >
      {children}
    </Link>
  );
}

/** A titled row of cards that scrolls sideways on phones. */
function Row({ title, icon, items }: { title: string; icon: React.ReactNode; items: MarketCampaign[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-semibold tracking-tight [&>svg]:size-4 [&>svg]:text-[rgb(var(--brand-ta))]">
        {icon}
        {title}
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">{items.length}</span>
      </h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {items.map((c) => (
          <div key={c.id} className="w-[62%] shrink-0 snap-start sm:w-56">
            <MarketCard c={c} href={`/clipper/campaigns/${c.id}`} link={Link} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** The biggest open campaign, shown large at the top. */
function Featured({ c }: { c: MarketCampaign }) {
  const r = rateParts(c);
  return (
    <Link href={`/clipper/campaigns/${c.id}`} className="group relative block overflow-hidden rounded-3xl border border-zinc-200/80 shadow-card">
      <CampaignCover campaign={c} brandName="" variant="banner" showTitle={false} className="transition duration-500 group-hover:scale-[1.02]" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 80%)' }} />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6" style={{ color: '#fff' }}>
        <p className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <Flame className="size-3.5" /> Featured
        </p>
        <h2 className="balance mt-2 text-xl font-semibold tracking-tight sm:text-3xl">{c.title}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <StreamerAvatar name={c.brandName} src={c.brandAvatar} />
          {c.brandName}
          {c.brandVerified && <VerifiedMark />}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink">
            {r.rate} {r.unit}
          </span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {usdCompact(c.budget.available)} left to earn
          </span>
          <span className="ml-auto hidden items-center gap-1 text-sm font-semibold sm:inline-flex">
            View campaign <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function DiscoverPage({ searchParams }: { searchParams: Search }) {
  const { openCampaigns, interests = [] } = await getCreatorDashboard();
  const { category, type } = searchParams;
  const url = (next: Search) => {
    const q = new URLSearchParams();
    const m = { category, type, ...next };
    if (m.category) q.set('category', m.category);
    if (m.type) q.set('type', m.type);
    const s = q.toString();
    return `/clipper/discover${s ? `?${s}` : ''}`;
  };
  const filtering = !!(category || type);
  // Only offer filters that match at least one open campaign.
  const cats = CATEGORIES.filter((c) => openCampaigns.some((x) => x.category === c));
  const types = CONTENT_TYPES.filter(([id]) => openCampaigns.some((x) => x.content_types?.includes(id)));
  const shown = openCampaigns.filter((c) => (!category || c.category === category) && (!type || c.content_types?.includes(type)));

  const featured = [...openCampaigns].sort((a, b) => b.budget.available - a.budget.available)[0];
  const forYou = interests.length ? [...openCampaigns].filter((c) => fit(c, interests) > 0).sort((a, b) => fit(b, interests) - fit(a, interests)).slice(0, 8) : [];
  const topPaying = [...openCampaigns].sort((a, b) => payScore(b) - payScore(a)).slice(0, 8);
  const fresh = [...openCampaigns].filter((c) => Date.now() - new Date(c.created_at).getTime() < 7 * 86_400_000).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const closing = openCampaigns.filter((c) => c.budget.usedShare >= 0.6).slice(0, 8);

  return (
    <>
      <PageHeader title="Discover" description="Campaigns looking for clippers. You’re paid on views the platforms report, never screenshots." />
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as they launch." />
      ) : (
        <div className="space-y-10">
          {!filtering && (
            <p className="-mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
              <span><b className="font-semibold text-zinc-900">{openCampaigns.length}</b> open</span>
              <span><b className="font-semibold text-zinc-900">{usdCompact(openCampaigns.reduce((n, c) => n + c.budget.available, 0))}</b> up for grabs</span>
              <span><b className="font-semibold text-zinc-900">{fresh.length}</b> new this week</span>
            </p>
          )}
          {!filtering && featured && <Featured c={featured} />}
          {!filtering && openCampaigns.length > 1 && (
            <>
              <Row title="For you" icon={<Sparkles />} items={forYou} />
              <Row title="Highest paying" icon={<TrendingUp />} items={topPaying} />
              <Row title="New this week" icon={<Flame />} items={fresh} />
              <Row title="Budget running out" icon={<Timer />} items={closing} />
            </>
          )}

          <section>
            <h2 className="mb-3 font-semibold tracking-tight">All campaigns</h2>
            {(cats.length > 0 || types.length > 0) && (
              <div className="mb-5 space-y-2">
                {cats.length > 0 && (
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <Chip href={url({ category: undefined })} on={!category}>
                      All niches
                    </Chip>
                    {cats.map((c) => (
                      <Chip key={c} href={url({ category: c })} on={category === c}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                )}
                {types.length > 0 && (
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <Chip href={url({ type: undefined })} on={!type}>
                      Any video type
                    </Chip>
                    {types.map(([id, label]) => (
                      <Chip key={id} href={url({ type: id })} on={type === id}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
            )}
            {shown.length === 0 ? (
              <Empty icon={<Compass />} title="Nothing matches those filters" body="Try another niche or video type." />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {shown.map((c) => (
                  <MarketCard key={c.id} c={c} href={`/clipper/campaigns/${c.id}`} link={Link} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
