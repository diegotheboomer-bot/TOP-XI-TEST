'use client';

import { useMemo, useState } from 'react';
// The /pure entry only fetches Stripe.js from js.stripe.com when loadStripe is
// first called, so demo pages never load it.
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { elementsAppearance } from '@/lib/stripe-appearance';
import { usdCents } from '@/lib/format';
import type { DepositIntentResult, DepositQuote } from '@/actions/brand';
import { useAppTheme } from '../use-app-theme';
import { FormMessage } from '../form-message';
import { PayButton, type Quote } from './fund-checkout';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (key: string) => (stripePromise ??= loadStripe(key));

const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap' }];

type CreateIntent = (campaignId: string, amount: number, tokenId: string) => Promise<DepositIntentResult>;
type QuoteDeposit = (campaignId: string, amount: number, tokenId: string) => Promise<DepositQuote | { error: string }>;

/**
 * Stripe Payment Element, confirmed from the server: the card entered sets Stripe's exact fee,
 * which is shown before the business pays (the campaign always gets the full budget).
 */
export function StripePayment({
  publishableKey,
  quote,
  campaignId,
  createIntent,
  quoteDeposit,
  onPaid,
  bankTransfer = false,
}: {
  publishableKey: string;
  /** Offer US bank account (ACH); only when it's turned on in Stripe, or the form won't load. */
  bankTransfer?: boolean;
  quote: Quote | null;
  campaignId: string;
  createIntent: CreateIntent;
  quoteDeposit: QuoteDeposit;
  onPaid: (pending?: boolean, exact?: Quote) => void;
}) {
  const theme = useAppTheme();
  // The exact price for the entered card, once known (null: the estimate is shown).
  const [exact, setExact] = useState<(DepositQuote & { tokenId: string }) | null>(null);
  const shown = exact && quote && exact.budget === quote.amount ? Math.round(exact.total * 100) : quote?.totalCents;
  // Elements needs a positive amount; keep the last valid one while the input is being edited.
  const [shownCents, setShownCents] = useState(shown ?? 100);
  if (shown && shown !== shownCents) setShownCents(shown);

  const options = useMemo(
    () => ({ mode: 'payment' as const, currency: 'usd', amount: shownCents, paymentMethodCreation: 'manual' as const, allowedPaymentMethodTypes: bankTransfer ? ['card', 'us_bank_account'] : ['card'], appearance: elementsAppearance(theme), fonts: FONTS }),
    [shownCents, theme, bankTransfer],
  );

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <PaymentForm quote={quote} exact={exact && quote && exact.budget === quote.amount ? exact : null} setExact={setExact} campaignId={campaignId} createIntent={createIntent} quoteDeposit={quoteDeposit} onPaid={onPaid} />
    </Elements>
  );
}

function PaymentForm({
  quote,
  exact,
  setExact,
  campaignId,
  createIntent,
  quoteDeposit,
  onPaid,
}: {
  quote: Quote | null;
  exact: (DepositQuote & { tokenId: string }) | null;
  setExact: (q: (DepositQuote & { tokenId: string }) | null) => void;
  campaignId: string;
  createIntent: CreateIntent;
  quoteDeposit: QuoteDeposit;
  onPaid: (pending?: boolean, exact?: Quote) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !quote) return;
    setBusy(true);
    setError(undefined);
    const fail = (message?: string) => {
      setError(message ?? 'Payment failed. Try again.');
      setBusy(false);
    };

    // Validate the fields (and collect wallet details), then read the card's details.
    const { error: fieldError } = await elements.submit();
    if (fieldError) return fail(fieldError.message);
    const { error: tokenError, confirmationToken } = await stripe.createConfirmationToken({
      elements,
      params: { return_url: `${window.location.origin}/streamer/campaigns/${campaignId}?funded=1` },
    });
    if (tokenError) return fail(tokenError.message);

    // The exact fee for this card. If it differs from what's on screen, show it first.
    const priced = await quoteDeposit(campaignId, quote.amount, confirmationToken.id);
    if ('error' in priced) return fail(priced.error);
    const shownTotal = exact ? exact.total : quote.total;
    if (Math.round(priced.total * 100) !== Math.round(shownTotal * 100)) {
      setExact({ ...priced, tokenId: confirmationToken.id });
      setBusy(false);
      return;
    }

    const intent = await createIntent(campaignId, quote.amount, confirmationToken.id);
    if ('error' in intent) return fail(intent.error);
    let status = intent.status;
    if (status === 'requires_action') {
      // 3D Secure or a bank step.
      const { error: actionError, paymentIntent } = await stripe.handleNextAction({ clientSecret: intent.clientSecret });
      if (actionError) return fail(actionError.message);
      status = paymentIntent?.status ?? status;
    }
    if (status !== 'succeeded' && status !== 'processing') return fail('Payment didn’t go through. Try another card.');
    // Bank transfers (ACH) stay 'processing' for a few business days; the budget is added when they clear.
    onPaid(status === 'processing', { amount: priced.budget, fee: priced.fee, total: priced.total, totalCents: Math.round(priced.total * 100) });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative min-h-[13rem]">
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
        {!ready && <div className="absolute inset-0 animate-pulse rounded-lg bg-zinc-100" aria-label="Loading payment form" />}
      </div>
      {exact && (
        <p className="rounded-lg bg-brand-a/10 px-3.5 py-2.5 text-sm ring-1 ring-inset ring-brand-a/30">
          For this card Stripe charges <b>{usdCents(exact.fee)}</b> ({exact.label}). Total <b>{usdCents(exact.total)}</b>; the campaign still gets the full {usdCents(exact.budget)}.
        </p>
      )}
      <FormMessage state={error ? { error } : undefined} />
      <PayButton quote={exact && quote ? { amount: exact.budget, fee: exact.fee, total: exact.total, totalCents: Math.round(exact.total * 100) } : quote} busy={busy} disabled={!stripe || !ready} />
    </form>
  );
}
