import { getCreatorDashboard } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { EarningsView } from '@/components/clipper-stats';

export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const d = await getCreatorDashboard();
  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="What you’ve earned, what’s been paid and what’s on the way." />
      <EarningsView d={d} />
    </div>
  );
}
