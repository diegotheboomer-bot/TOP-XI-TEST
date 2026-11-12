import { getCreatorDashboard, getReferralSummary } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { EarningsView } from '@/components/clipper-stats';
import { ReferralPanel } from '@/components/referral-panel';

export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const [d, referral] = await Promise.all([getCreatorDashboard(), getReferralSummary()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="What you’ve earned, what’s been paid and what’s on the way." />
      <EarningsView d={d} extra={referral && <ReferralPanel r={referral} />} />
    </div>
  );
}
