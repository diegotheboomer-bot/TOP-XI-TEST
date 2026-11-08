import { redirect } from 'next/navigation';
import { Logo } from '@/components/site-header';
import { Card } from '@/components/ui/card';
import { OnboardingForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  if (isDemo) redirect('/brand');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (viewer.brandId) redirect('/brand');
  if (viewer.creatorId) redirect('/creator');
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">Set up your account</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Choose how you’ll use Creator Engine.</p>
          <OnboardingForm />
        </Card>
      </div>
    </main>
  );
}
