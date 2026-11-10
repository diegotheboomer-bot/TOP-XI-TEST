import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCampaignDetail } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { EditCampaignForm } from '@/components/forms/edit-campaign-form';

export const dynamic = 'force-dynamic';

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const detail = await getCampaignDetail(params.id);
  if (!detail) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/streamer/campaigns/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> {detail.campaign.title}
      </Link>
      <PageHeader title="Edit campaign" description="Update the thumbnail, instructions and references. Clippers see changes right away." />
      <EditCampaignForm campaign={detail.campaign} />
    </div>
  );
}
