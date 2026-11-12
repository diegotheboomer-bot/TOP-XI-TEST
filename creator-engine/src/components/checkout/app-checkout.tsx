'use client';

import { useRouter } from 'next/navigation';
import type { ActionState } from '@/actions/result';
import type { DepositIntentResult, DepositQuote } from '@/actions/brand';
import { AddBudget, type CheckoutCampaign } from './fund-checkout';
import { MockPayment } from './mock-payment';
import { StripePayment } from './stripe-payment';

/** The Next.js app's "Add budget" popup: Stripe when configured, the mock card form in demo mode. */
export function AppAddBudget({
  campaign,
  feePercent,
  feeFixed = 0,
  early = false,
  publishableKey,
  createIntent,
  quoteDeposit,
  payDemo,
  bankTransfer = false,
  initialAmount,
}: {
  initialAmount?: number;
  bankTransfer?: boolean;
  campaign: CheckoutCampaign;
  feePercent: number;
  feeFixed?: number;
  early?: boolean;
  /** null in demo mode. */
  publishableKey: string | null;
  createIntent: (campaignId: string, amount: number, tokenId: string) => Promise<DepositIntentResult>;
  quoteDeposit: (campaignId: string, amount: number, tokenId: string) => Promise<DepositQuote | { error: string }>;
  payDemo: (campaignId: string, amount: number) => Promise<ActionState>;
}) {
  const router = useRouter();
  return (
    <AddBudget
      campaign={campaign}
      feePercent={feePercent}
      feeFixed={feeFixed}
      early={early}
      className="w-full"
      initialAmount={initialAmount}
      // Stripe confirms the deposit by webhook, so the balance can lag a moment behind.
      onDone={() => router.refresh()}
      note={publishableKey ? 'Payments are processed by Stripe. Card details never touch our servers.' : 'Demo mode: mock money only.'}
      payment={(quote, onPaid) =>
        publishableKey ? (
          <StripePayment publishableKey={publishableKey} quote={quote} campaignId={campaign.id} createIntent={createIntent} quoteDeposit={quoteDeposit} onPaid={onPaid} bankTransfer={bankTransfer} />
        ) : (
          <MockPayment quote={quote} onPay={(amount) => payDemo(campaign.id, amount)} onPaid={onPaid} />
        )
      }
    />
  );
}
