import Link from 'next/link';
import { Compass } from 'lucide-react';
import { getCreatorDashboard } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { Empty } from '@/components/ui/empty';
import { MarketCard } from '@/components/views';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const { openCampaigns } = await getCreatorDashboard();
  return (
    <>
      <PageHeader title="Discover" description="Open campaigns you haven’t joined. Every rate is paid on verified views or tracked sales." />
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as brands go live." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {openCampaigns.map((c) => (
            <MarketCard key={c.id} c={c} href={`/creator/campaigns/${c.id}`} link={Link} />
          ))}
        </div>
      )}
    </>
  );
}
