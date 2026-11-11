import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';
import { getBrandDashboard } from '@/lib/data';
import { compact, usd } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { CampaignRow, Checklist } from '@/components/views';
import { StreamerTour } from '@/components/streamer-tour';

export const dynamic = 'force-dynamic';

export default async function BrandDashboardPage() {
  const { brandName, campaigns } = await getBrandDashboard();
  const sum = (f: (c: (typeof campaigns)[number]) => number) => campaigns.reduce((a, c) => a + f(c), 0);
  const pending = sum((c) => c.pendingReview);
  const firstDraft = campaigns.find((c) => c.status === 'draft');

  return (
    <>
      <StreamerTour />
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
      <Checklist
        title="Launch your first campaign"
        steps={[
          { label: 'Create a campaign', detail: 'Set your rate, cap and which platforms clippers can post on.', done: campaigns.length > 0, action: <ButtonLink href="/streamer/campaigns/new" size="sm">Create</ButtonLink> },
          { label: 'Fund it', detail: 'Add the budget. Clippers are paid from it as their views come in.', done: campaigns.some((c) => c.budget.deposited > 0), action: firstDraft ? <ButtonLink href={`/streamer/campaigns/${firstDraft.id}`} size="sm">Open</ButtonLink> : undefined },
          { label: 'Launch and pin moments', detail: 'Pin timestamps from your stream so clippers know what to cut.', done: campaigns.some((c) => c.status === 'active') },
        ]}
      />
      <StatGrid
        className="mt-6"
        items={[
          { label: 'Escrow held', value: usd(sum((c) => c.escrow_balance)) },
          { label: 'Earned by clippers', value: usd(sum((c) => c.budget.committed)) },
          { label: 'Verified views', value: compact(sum((c) => c.views)) },
          { label: 'Clips', value: compact(sum((c) => c.submissions)) },
        ]}
      />
      <Card flush className="mt-8 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-5">
            <Empty
              icon={<Megaphone />}
              title="No campaigns yet"
              body="Create a campaign, add a budget and launch it to start getting clips."
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
