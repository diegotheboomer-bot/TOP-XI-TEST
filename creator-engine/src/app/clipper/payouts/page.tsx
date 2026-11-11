import { MoneyJourney } from '@/components/payouts/money-journey';
import { getCreatorDashboard, getPayoutHistory } from '@/lib/data';
import { PayoutHistory, PayoutSteps } from '@/components/payout-history';
import { PAYOUT_METHOD_LABEL } from '@/lib/payout-methods';
import { isDemo } from '@/lib/env';
import { paypalConfigured } from '@/lib/paypal';
import { completeDemoPayouts, createPayoutSession, openPayoutDashboard, refreshPayoutStatus, savePayoutMethod } from '@/actions/creator';
import { currentCreatorId, demoCreators } from '@/lib/demo';
import { PageHeader } from '@/components/ui/page-header';
import { CreatorSwitcher } from '@/components/creator-switcher';
import { Button } from '@/components/ui/button';
import { PayoutsView } from '@/components/payouts/payouts-view';
import { rowsOf } from '@/components/clipper-stats';
import { usdCents } from '@/lib/format';
import { AppPayoutForm } from '@/components/payouts/app-payouts';

export const dynamic = 'force-dynamic';

export default async function PayoutsPage() {
  const [d, history] = await Promise.all([getCreatorDashboard(), getPayoutHistory()]);
  const rows = rowsOf(d);
  const summary = {
    paid: usdCents(rows.reduce((n, r) => n + r.sub.payout_transferred, 0)),
    owed: usdCents(rows.filter((r) => r.sub.status !== 'flagged').reduce((n, r) => n + Math.max(0, r.sub.payout_earned - r.sub.payout_transferred), 0)),
  };
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Payouts"
        description="Where your money goes, and every payout you’ve received."
        actions={isDemo ? <CreatorSwitcher creators={demoCreators()} current={currentCreatorId()} /> : undefined}
      />
      <PayoutSteps
        methodReady={d.payoutsEnabled}
        methodLabel={d.payout.method === 'stripe' ? 'Bank account' : PAYOUT_METHOD_LABEL[d.payout.method]}
        approved={rows.some((r) => r.sub.status === 'live_tracking' || r.sub.status === 'paid')}
        cashedOut={history.length > 0 || rows.some((r) => r.sub.payout_transferred > 0)}
      />
      <PayoutsView
        key={isDemo ? currentCreatorId() : undefined}
        setup={d.payout}
        summary={summary}
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
      <PayoutHistory events={history} />
      <MoneyJourney />
    </div>
  );
}
