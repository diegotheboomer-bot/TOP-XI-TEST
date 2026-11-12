import { getCreatorDashboard, getReferralSummary } from '@/lib/data';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { stripeCostFor } from '@/lib/cash-out';
import { PageHeader } from '@/components/ui/page-header';
import { EarningsView } from '@/components/clipper-stats';
import { ReferralPanel } from '@/components/referral-panel';

export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const [d, referral, viewer] = await Promise.all([getCreatorDashboard(), getReferralSummary(), getViewer()]);
  // Stripe's payout charge comes off each cash-out; shown before confirming.
  const payout = !isDemo && viewer?.creatorId ? await stripeCostFor(createAdminClient(), viewer.creatorId) : { viaStripe: false, firstThisMonth: false };
  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="What you’ve earned, what’s been paid and what’s on the way." />
      <EarningsView d={d} payout={payout} extra={referral && <ReferralPanel r={referral} />} />
    </div>
  );
}
