import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { SignInForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (isDemo) redirect('/streamer');
  if (await getViewer()) redirect('/onboarding');
  return (
    <AuthShell title="Sign in" subtitle="Welcome back.">
      {searchParams.error && <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">That link didn’t work or has expired. Sign in below.</p>}
      <SignInForm />
    </AuthShell>
  );
}
