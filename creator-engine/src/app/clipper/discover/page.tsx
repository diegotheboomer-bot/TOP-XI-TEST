import { Compass } from 'lucide-react';
import { getCreatorDashboard, type MarketCampaign } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { DiscoverBrowser } from '@/components/discover-browser';

export const dynamic = 'force-dynamic';

const POST_TO_PLATFORM: Record<string, string> = { 'post:TikTok': 'tiktok', 'post:YouTube Shorts': 'youtube', 'post:Instagram Reels': 'instagram' };

/** How well a campaign fits what the clipper told us: their topics and the platforms they post on. */
function fit(c: MarketCampaign, interests: string[]): number {
  let score = 0;
  if (c.category && interests.includes(c.category)) score += 3;
  for (const i of interests) if (POST_TO_PLATFORM[i] && c.platforms.includes(POST_TO_PLATFORM[i] as never)) score += 1;
  return score;
}

export default async function DiscoverPage() {
  const { openCampaigns, interests = [] } = await getCreatorDashboard();
  const forYou = interests.length ? [...openCampaigns].filter((c) => fit(c, interests) > 0).sort((a, b) => fit(b, interests) - fit(a, interests)).slice(0, 8).map((c) => c.id) : [];
  return (
    <>
      <PageHeader title="Discover" description="Campaigns looking for clippers. Paid on real, verified views." />
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as they launch." />
      ) : (
        <DiscoverBrowser campaigns={openCampaigns} forYou={forYou} />
      )}
    </>
  );
}
