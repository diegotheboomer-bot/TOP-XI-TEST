import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { SignUpForm } from '@/components/forms/account-forms';
import { enabledProviders } from '@/components/forms/oauth-buttons';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SignUpPage({ searchParams }: { searchParams: { role?: string; invite?: string } }) {
  if (isDemo) redirect(searchParams.role === 'creator' ? '/clipper' : '/streamer');
  if (await getViewer()) redirect('/onboarding');
  return (
    <AuthShell title="Create your account" subtitle="Takes a minute. We’ll email you a code to confirm." wide>
      {searchParams.invite === 'own' && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          This invite link won’t count here: it was opened on the inviter’s own device or connection. Invites only count for new people on their own phone or computer. You can still sign up.
        </p>
      )}
      <SignUpForm providers={enabledProviders()} defaultRole={searchParams.role === 'creator' ? 'creator' : searchParams.role === 'agency' ? 'agency' : 'brand'} />
    </AuthShell>
  );
}
