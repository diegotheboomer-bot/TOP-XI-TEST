import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { SignUpForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SignUpPage({ searchParams }: { searchParams: { role?: string } }) {
  if (isDemo) redirect(searchParams.role === 'creator' ? '/clipper' : '/streamer');
  if (await getViewer()) redirect('/onboarding');
  return (
    <AuthShell title="Create your account" subtitle="Takes a minute. We’ll email you a code to confirm." wide>
      <SignUpForm defaultRole={searchParams.role === 'creator' ? 'creator' : 'brand'} />
    </AuthShell>
  );
}
