'use client';

import { useEffect, useState } from 'react';
// The /pure entry only loads Connect.js from Stripe when initialised.
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js/pure';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { connectAppearance } from '@/lib/stripe-appearance';
import type { PayoutSessionResult } from '@/actions/creator';
import { useAppTheme } from '../use-app-theme';
import { FormMessage } from '../form-message';

/** Stripe's embedded onboarding form for the clipper's payout account, styled like the app. */
export function StripeOnboarding({
  publishableKey,
  createSession,
  onExit,
}: {
  publishableKey: string;
  createSession: () => Promise<PayoutSessionResult>;
  onExit: () => void;
}) {
  const theme = useAppTheme();
  const [instance, setInstance] = useState<StripeConnectInstance>();
  const [error, setError] = useState<string>();

  // Connect.js needs the browser, so it starts after mount.
  useEffect(() => {
    setInstance(
      loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => {
          const result = await createSession();
          if ('error' in result) {
            setError(result.error);
            throw new Error(result.error);
          }
          return result.clientSecret;
        },
        appearance: connectAppearance(theme),
      }),
    );
    // Initialise once; theme changes are applied below with update().
  }, [publishableKey]);

  useEffect(() => {
    instance?.update({ appearance: connectAppearance(theme) });
  }, [instance, theme]);

  if (error) return <FormMessage state={{ error }} />;
  if (!instance) return <div className="h-72 animate-pulse rounded-lg bg-zinc-100" aria-label="Loading payout setup" />;
  const origin = window.location.origin;
  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <ConnectAccountOnboarding
        onExit={onExit}
        collectionOptions={{ fields: 'currently_due', futureRequirements: 'omit' }}
        fullTermsOfServiceUrl={`${origin}/terms`}
        privacyPolicyUrl={`${origin}/privacy`}
        onLoadError={({ error }) => setError(error.message ?? 'Payout setup failed to load.')}
      />
    </ConnectComponentsProvider>
  );
}
