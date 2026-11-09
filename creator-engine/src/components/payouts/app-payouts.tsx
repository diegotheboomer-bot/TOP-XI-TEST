'use client';

import { useRouter } from 'next/navigation';
import type { ActionState } from '@/actions/result';
import type { PayoutSessionResult } from '@/actions/creator';
import { MockOnboarding } from './mock-onboarding';
import { StripeOnboarding } from './stripe-onboarding';

/** The Next.js app's payout form: Stripe's embedded onboarding, or the mock form in demo mode. */
export function AppPayoutForm({
  publishableKey,
  createSession,
  refreshStatus,
  completeDemo,
}: {
  /** null in demo mode. */
  publishableKey: string | null;
  createSession: () => Promise<PayoutSessionResult>;
  refreshStatus: () => Promise<ActionState>;
  completeDemo: () => Promise<ActionState>;
}) {
  const router = useRouter();
  const finish = async (run: () => Promise<ActionState>) => {
    const result = await run();
    router.refresh();
    return result;
  };
  return publishableKey ? (
    <StripeOnboarding publishableKey={publishableKey} createSession={createSession} onExit={() => void finish(refreshStatus)} />
  ) : (
    <MockOnboarding onDone={() => finish(completeDemo)} />
  );
}
