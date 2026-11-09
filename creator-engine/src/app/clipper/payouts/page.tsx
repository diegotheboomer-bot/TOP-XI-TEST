import { getCreatorDashboard } from '@/lib/data';
import { isDemo } from '@/lib/env';
import { completeDemoPayouts, createPayoutSession, openPayoutDashboard, refreshPayoutStatus } from '@/actions/creator';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { Button } from '@/components/ui/button';
import { PayoutsView } from '@/components/payouts/payouts-view';
import { AppPayoutForm } from '@/components/payouts/app-payouts';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const d = await getCreatorDashboard();
  const publishableKey = isDemo ? null : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey === undefined || publishableKey === '') {
    throw new Error('Missing environment variable NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  return (
    <div className="space-y-8">
      <PageHeader title="Payouts" description="Where your earnings go. Set up once, then get paid for every approved clip."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />
      <PayoutsView
        enabled={d.payoutsEnabled}
        form={<AppPayoutForm publishableKey={publishableKey} createSession={createPayoutSession} refreshStatus={refreshPayoutStatus} completeDemo={completeDemoPayouts} />}
        manage={
          isDemo ? (
            <p className="text-sm text-zinc-500">In the real app, this opens your Stripe Express dashboard: payout history, bank details and tax forms.</p>
          ) : (
            <form action={openPayoutDashboard}>
              <Button variant="secondary">Open Stripe dashboard</Button>
            </form>
          )
        }
      />
    </div>
  );
}
