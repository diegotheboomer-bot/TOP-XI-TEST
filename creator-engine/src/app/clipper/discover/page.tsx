import Link from 'next/link';
import { Compass } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { MarketCard } from '@/components/views';
import { CATEGORIES, CONTENT_TYPES } from '@/lib/campaign-tags';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

type Search = { category?: string; type?: string };

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

export default async function DiscoverPage({ searchParams }: { searchParams: Search }) {
  const { openCampaigns } = await getCreatorDashboard();
  const { category, type } = searchParams;
  const url = (next: Search) => {
    const q = new URLSearchParams();
    const m = { category, type, ...next };
    if (m.category) q.set('category', m.category);
    if (m.type) q.set('type', m.type);
    const s = q.toString();
    return `/clipper/discover${s ? `?${s}` : ''}`;
  };
  // Only offer filters that match at least one open campaign.
  const cats = CATEGORIES.filter((c) => openCampaigns.some((x) => x.category === c));
  const types = CONTENT_TYPES.filter(([id]) => openCampaigns.some((x) => x.content_types?.includes(id)));
  const shown = openCampaigns.filter(
    (c) => (!category || c.category === category) && (!type || c.content_types?.includes(type)),
  );
  return (
    <>
      <PageHeader title="Discover" description="Streamers looking for clippers. Rates are paid on views the platforms report, never screenshots." />
      {(cats.length > 0 || types.length > 0) && (
        <div className="mb-5 space-y-2">
          {cats.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <Chip href={url({ category: undefined })} on={!category}>All niches</Chip>
              {cats.map((c) => (
                <Chip key={c} href={url({ category: c })} on={category === c}>{c}</Chip>
              ))}
            </div>
          )}
          {types.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <Chip href={url({ type: undefined })} on={!type}>Any video type</Chip>
              {types.map(([id, label]) => (
                <Chip key={id} href={url({ type: id })} on={type === id}>{label}</Chip>
              ))}
            </div>
          )}
        </div>
      )}
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as streamers go live." />
      ) : shown.length === 0 ? (
        <Empty icon={<Compass />} title="Nothing matches those filters" body="Try another niche or video type." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <MarketCard key={c.id} c={c} href={`/clipper/campaigns/${c.id}`} link={Link} />
          ))}
        </div>
      )}
    </>
  );
}
