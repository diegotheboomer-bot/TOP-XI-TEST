import { getCreatorDashboard } from '@/lib/data';
import { isDemo } from '@/lib/env';
import { paypalConfigured } from '@/lib/paypal';
import { completeDemoPayouts, createPayoutSession, openPayoutDashboard, refreshPayoutStatus, savePayoutMethod } from '@/actions/creator';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { Button } from '@/components/ui/button';
import { PayoutsView } from '@/components/payouts/payouts-view';
import { AppPayoutForm } from '@/components/payouts/app-payouts';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const d = await getCreatorDashboard();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return (
    <div className="space-y-8">
      <PageHeader
        title="Payouts"
        description="Where your earnings go. Set up once, then get paid for every approved clip."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />
      <PayoutsView
        key={isDemo ? currentCreatorId() : undefined}
        setup={d.payout}
        onSave={savePayoutMethod}
        methods={isDemo || paypalConfigured() ? ['stripe', 'paypal', 'venmo'] : ['stripe']}
        stripeForm={
          isDemo || publishableKey ? (
            <AppPayoutForm publishableKey={isDemo ? null : publishableKey!} createSession={createPayoutSession} refreshStatus={refreshPayoutStatus} completeDemo={completeDemoPayouts} />
          ) : (
            <p className="text-sm text-rose-600">Bank payouts aren’t set up yet: add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
          )
        }
        manageStripe={
          isDemo ? (
            <p className="self-center text-xs text-zinc-500">In the real app, “Open Stripe dashboard” shows payout history, bank details and tax forms.</p>
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
