import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { AuthShell } from '@/components/auth-shell';
import { WelcomeForm } from '@/components/forms/welcome-form';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (!viewer.brandId && !viewer.creatorId) redirect('/onboarding');
  const clipper = !!viewer.creatorId && !viewer.brandId;
  return (
    <AuthShell title="Welcome to Atlas" subtitle="Three quick questions so we can show you what fits. Takes 20 seconds." wide>
      <WelcomeForm clipper={clipper} />
    </AuthShell>
  );
}
