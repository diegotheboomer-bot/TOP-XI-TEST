import { getCreatorDashboard } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { ClipsView } from '@/components/clipper-stats';

export const dynamic = 'force-dynamic';

export default async function ClipsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const d = await getCreatorDashboard();
  return (
    <div className="space-y-6">
      <PageHeader title="Your clips" description="Every clip you’ve submitted, with its views and earnings." />
      <ClipsView d={d} tab={searchParams.tab ?? 'all'} />
    </div>
  );
}
