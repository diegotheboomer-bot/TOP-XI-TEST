import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { AppPayoutForm } from '@/components/payouts/app-payouts';
import { ButtonLink } from '@/components/ui/button-link';
import { createBrandPayoutSession, refreshBrandPayoutStatus } from '@/actions/affiliate';

export const dynamic = 'force-dynamic';

/** Payout account for a business, only used to cash out affiliate earnings. */
export default async function BrandPayoutsPage() {
  const viewer = await getViewer();
  if (!viewer?.brandId || isDemo) redirect('/streamer');
  const { data: brand } = await createAdminClient().from('brands').select('payouts_enabled').eq('id', viewer.brandId).single();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Cash-out account" description="Where your affiliate earnings are sent. Stripe checks who you are once, then pays to your bank." />
      {brand?.payouts_enabled ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-a/10 p-4 ring-1 ring-inset ring-brand-a/30">
          <span className="flex items-center gap-2 font-medium"><Check className="size-4 text-[rgb(var(--brand-ta))]" /> Payouts are on</span>
          <ButtonLink href="/streamer/invite" size="sm">Back to Invite & earn</ButtonLink>
        </div>
      ) : publishableKey ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-card sm:p-6">
          <AppPayoutForm publishableKey={publishableKey} createSession={createBrandPayoutSession} refreshStatus={refreshBrandPayoutStatus} completeDemo={refreshBrandPayoutStatus} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Payouts aren’t switched on yet.</p>
      )}
    </div>
  );
}
