'use client';

import { useMemo, useState } from 'react';
// The /pure entry only fetches Stripe.js from js.stripe.com when loadStripe is
// first called, so demo pages never load it.
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { elementsAppearance } from '@/lib/stripe-appearance';
import type { DepositIntentResult } from '@/actions/brand';
import { useAppTheme } from '../use-app-theme';
import { FormMessage } from '../form-message';
import { PayButton, type Quote } from './fund-checkout';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (key: string) => (stripePromise ??= loadStripe(key));

const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap' }];

/**
 * Stripe Payment Element with the PaymentIntent created at submit time
 * (deferred intent), so the amount can change until the streamer pays.
 */
export function StripePayment({
  publishableKey,
  quote,
  campaignId,
  createIntent,
  onPaid,
}: {
  publishableKey: string;
  quote: Quote | null;
  campaignId: string;
  createIntent: (campaignId: string, amount: number) => Promise<DepositIntentResult>;
  onPaid: () => void;
}) {
  const theme = useAppTheme();
  // Elements needs a positive amount; keep the last valid one while the input is being edited.
  const [shownCents, setShownCents] = useState(quote?.totalCents ?? 100);
  if (quote && quote.totalCents !== shownCents) setShownCents(quote.totalCents);

  const options = useMemo(
    () => ({ mode: 'payment' as const, currency: 'usd', amount: shownCents, appearance: elementsAppearance(theme), fonts: FONTS }),
    [shownCents, theme],
  );

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <PaymentForm quote={quote} campaignId={campaignId} createIntent={createIntent} onPaid={onPaid} />
    </Elements>
  );
}

function PaymentForm({
  quote,
  campaignId,
  createIntent,
  onPaid,
}: {
  quote: Quote | null;
  campaignId: string;
  createIntent: (campaignId: string, amount: number) => Promise<DepositIntentResult>;
  onPaid: () => void;
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

    // Validate the fields (and collect wallet details) before creating the intent.
    const { error: fieldError } = await elements.submit();
    if (fieldError) return fail(fieldError.message);

    const intent = await createIntent(campaignId, quote.amount);
    if ('error' in intent) return fail(intent.error);

    const { error: payError } = await stripe.confirmPayment({
      elements,
      clientSecret: intent.clientSecret,
      // Only used by payment methods that redirect (bank redirects); cards finish here.
      confirmParams: { return_url: `${window.location.origin}/streamer/campaigns/${campaignId}?funded=1` },
      redirect: 'if_required',
    });
    if (payError) return fail(payError.message);
    onPaid();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative min-h-[13rem]">
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
        {!ready && <div className="absolute inset-0 animate-pulse rounded-lg bg-zinc-100" aria-label="Loading payment form" />}
      </div>
      <FormMessage state={error ? { error } : undefined} />
      <PayButton quote={quote} busy={busy} disabled={!stripe || !ready} />
    </form>
  );
}
