import Link from 'next/link';
import { ArrowUpRight, CircleDollarSign, Eye, Megaphone, Plus, ShoppingBag, Wallet } from 'lucide-react';
import { getBrandDashboard } from '@/lib/data';
import { compact, payoutModelLabel, termsLabel, usd } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { CampaignBadge } from '@/components/status';

export const dynamic = 'force-dynamic';

export default async function BrandDashboardPage() {
  const { brandName, campaigns } = await getBrandDashboard();
  const total = (k: 'escrow_balance' | 'views' | 'conversions' | 'earned') => campaigns.reduce((a, c) => a + c[k], 0);

  return (
    <>
      <PageHeader
        eyebrow={<span className="text-sm font-medium text-zinc-500">{brandName}</span>}
        title="Campaigns"
        description="Escrow, verified reach and attributed sales across every campaign."
        actions={
          <ButtonLink href="/brand/campaigns/new">
            <Plus className="size-4" /> New campaign
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Escrow held" value={usd(total('escrow_balance'))} icon={<Wallet />} />
        <Stat label="Verified views" value={compact(total('views'))} icon={<Eye />} />
        <Stat label="Orders" value={compact(total('conversions'))} icon={<ShoppingBag />} />
        <Stat label="Earnings" value={usd(total('earned'))} icon={<CircleDollarSign />} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3">
        {campaigns.length === 0 ? (
          <Empty
            icon={<Megaphone />}
            title="No campaigns yet"
            body="Create a campaign, fund escrow and go live to start receiving creator submissions."
            action={<ButtonLink href="/brand/campaigns/new">Create campaign</ButtonLink>}
          />
        ) : (
          campaigns.map((c) => (
            <Link key={c.id} href={`/brand/campaigns/${c.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20">
              <Card className="grid gap-5 transition group-hover:border-zinc-300 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
                    <CampaignBadge status={c.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {payoutModelLabel[c.payout_model]} · {termsLabel(c)}
                  </p>
                </div>
                <dl className="grid grid-cols-4 gap-3">
                  {[
                    ['Creators', String(c.submissions)],
                    ['Views', compact(c.views)],
                    ['Orders', compact(c.conversions)],
                    ['Escrow', usd(c.escrow_balance)],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-xs text-zinc-500">{k}</dt>
                      <dd className="mt-0.5 truncate font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ArrowUpRight className="hidden size-5 text-zinc-400 transition group-hover:text-zinc-900 md:block" />
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
