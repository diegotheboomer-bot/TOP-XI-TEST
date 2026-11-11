import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getClipperProfileForBrand } from '@/lib/data';
import { ClipperProfileView } from '@/components/clipper-profile';

export const dynamic = 'force-dynamic';

export default async function ClipperPage({ params }: { params: { id: string } }) {
  const p = await getClipperProfileForBrand(params.id);
  if (!p) notFound();
  return (
    <div className="space-y-6">
      <Link href="/streamer/creators" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Creators
      </Link>
      <ClipperProfileView p={p} campaignHref={(id) => `/streamer/campaigns/${id}`} />
    </div>
  );
}
