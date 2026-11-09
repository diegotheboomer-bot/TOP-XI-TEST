import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBrandDashboard } from '@/lib/data';
import { PageHeader } from '@/components/ui/page-header';
import { CampaignForm } from '@/components/forms/campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const { brandName } = await getBrandDashboard();
  return (
    <>
      <Link href="/streamer" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>
      <PageHeader title="New campaign" description="Campaigns start as drafts. Fund escrow, then go live." />
      <CampaignForm brandName={brandName} />
    </>
  );
}
