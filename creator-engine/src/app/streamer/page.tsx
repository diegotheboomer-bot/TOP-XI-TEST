import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';
import { getBrandDashboard } from '@/lib/data';
import { compact, usd } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { CampaignRow } from '@/components/views';

export const dynamic = 'force-dynamic';

export default async function BrandDashboardPage() {
  const { brandName, campaigns } = await getBrandDashboard();
  const sum = (f: (c: (typeof campaigns)[number]) => number) => campaigns.reduce((a, c) => a + f(c), 0);
  const pending = sum((c) => c.pendingReview);

  return (
    <>
      <PageHeader
        eyebrow={<span className="text-sm text-zinc-500">{brandName}</span>}
        title="Campaigns"
        description={pending ? `${pending} ${pending === 1 ? 'clip is' : 'clips are'} waiting for your review.` : 'Every clip is reviewed.'}
        actions={
          <ButtonLink href="/streamer/campaigns/new">
            <Plus className="size-4" /> New campaign
          </ButtonLink>
        }
      />
      <StatGrid
        items={[
          { label: 'Escrow held', value: usd(sum((c) => c.escrow_balance)) },
          { label: 'Earned by clippers', value: usd(sum((c) => c.budget.committed)) },
          { label: 'Verified views', value: compact(sum((c) => c.views)) },
          { label: 'Merch orders', value: compact(sum((c) => c.conversions)) },
        ]}
      />
      <Card flush className="mt-8 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-5">
            <Empty
              icon={<Megaphone />}
              title="No campaigns yet"
              body="Create a campaign, fund it and go live to start getting clips."
              action={<ButtonLink href="/streamer/campaigns/new">Create campaign</ButtonLink>}
            />
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} href={`/streamer/campaigns/${c.id}`} link={Link} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
