import { redirect } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Logo } from '@/components/site-header';
import { Card } from '@/components/ui/card';
import { SubmitButton } from '@/components/submit-button';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TYPES: EmailOtpType[] = ['email', 'signup', 'magiclink', 'invite', 'email_change', 'recovery'];

/**
 * Email links land here (see supabase/email-templates). The token is only used
 * when the person presses the button, so email apps that open links to scan
 * them don't use it up, and it works in any browser, not just the one that
 * asked for the link.
 */
export default function ConfirmPage({ searchParams }: { searchParams: { token_hash?: string; type?: string } }) {
  const tokenHash = searchParams.token_hash ?? '';
  const type = (TYPES as string[]).includes(searchParams.type ?? '') ? (searchParams.type as EmailOtpType) : 'email';

  async function confirm() {
    'use server';
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type });
    redirect(error ? '/login?error=link' : '/onboarding');
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">Confirm it’s you</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Press continue to finish signing in.</p>
          {tokenHash ? (
            <form action={confirm}>
              <SubmitButton className="h-11 w-full" pendingText="Signing in…">
                Continue
              </SubmitButton>
            </form>
          ) : (
            <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">This link is incomplete. Request a new one from the sign-in page.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
