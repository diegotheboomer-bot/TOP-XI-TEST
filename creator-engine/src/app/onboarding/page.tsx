import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { insertCreator } from '@/lib/creator-signup';
import { Logo } from '@/components/site-header';
import { Card } from '@/components/ui/card';
import { OnboardingForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ searchParams }: { searchParams: { role?: string } }) {
  if (isDemo) redirect('/streamer');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (viewer.brandId) redirect('/streamer');
  if (viewer.creatorId) redirect('/clipper');

  // Signed up with a side and name already picked: create the profile and go straight in.
  const { data } = await createClient().auth.getUser();
  const meta = data.user?.user_metadata ?? {};
  const rawName = typeof meta.name === 'string' ? meta.name : typeof meta.full_name === 'string' ? meta.full_name : '';
  const name = rawName.trim().slice(0, 120);
  // Email sign-up stores the side in metadata; Google / Apple sign-up passes it in the URL.
  const side = ['brand', 'agency', 'creator'].includes(meta.role) ? meta.role : ['brand', 'agency', 'creator'].includes(searchParams.role ?? '') ? searchParams.role : undefined;
  if (side && name.length >= 2) {
    const admin = createAdminClient();
    const { error } =
      side !== 'creator'
        ? await admin.from('brands').insert({ owner_id: viewer.userId, name, kind: side === 'agency' ? 'agency' : 'streamer' })
        : await insertCreator(admin, viewer.userId, name);
    if (!error || error.code === '23505') redirect('/welcome');
  }
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">Set up your account</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Choose how you’ll use Atlas Clips.</p>
          <OnboardingForm defaultRole={searchParams.role === 'creator' ? 'creator' : 'brand'} />
        </Card>
      </div>
    </main>
  );
}
