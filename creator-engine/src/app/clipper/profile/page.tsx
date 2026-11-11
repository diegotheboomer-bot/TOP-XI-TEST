import { getMyClipperProfile } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { ClipperProfileView } from '@/components/clipper-profile';

export const dynamic = 'force-dynamic';

export default async function MyProfilePage() {
  const p = await getMyClipperProfile();
  return (
    <>
      <PageHeader title="Profile" description="Your tier, your record and every campaign you’ve clipped. Streamers see this when they review your clips." />
      {p ? <ClipperProfileView p={p} own campaignHref={(id) => `/clipper/campaigns/${id}`} /> : <p className="text-sm text-zinc-500">Profiles aren’t available in the demo.</p>}
    </>
  );
}
