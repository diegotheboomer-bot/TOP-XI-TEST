import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { CampaignForm } from '@/components/forms/campaign-form';

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/brand" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>
      <PageHeader title="New campaign" description="Campaigns start as drafts. Fund escrow, then go live." />
      <Card>
        <CampaignForm />
      </Card>
    </div>
  );
}
