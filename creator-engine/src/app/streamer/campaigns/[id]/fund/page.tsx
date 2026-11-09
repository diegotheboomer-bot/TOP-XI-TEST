import { notFound } from 'next/navigation';
import { getCampaignDetail } from '@/lib/data';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { platformFeePercent } from '@/lib/stripe';
import { createDepositIntent, payDemoDeposit } from '@/actions/brand';
import { AppCheckout } from '@/components/checkout/app-checkout';

export const dynamic = 'force-dynamic';

export default async function FundPage({ params }: { params: { id: string } }) {
  const detail = await getCampaignDetail(params.id);
  // Active campaigns are readable by everyone; only the owner can fund one.
  if (!detail || (!isDemo && detail.campaign.brand_id !== (await getViewer())?.brandId)) notFound();
  const { id, title, cover_color, thumbnail_url, payout_model, cpm_rate, escrow_balance } = detail.campaign;
  const publishableKey = isDemo ? null : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey === undefined || publishableKey === '') {
    throw new Error('Missing environment variable NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  return (
    <AppCheckout
      campaign={{ id, title, cover_color, thumbnail_url, payout_model, cpm_rate, escrow_balance }}
      feePercent={platformFeePercent()}
      publishableKey={publishableKey}
      createIntent={createDepositIntent}
      payDemo={payDemoDeposit}
    />
  );
}
