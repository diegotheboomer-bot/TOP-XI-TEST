import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/session';
import { isDemo } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppLayout } from '@/components/app-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AccountSettingsForm } from '@/components/forms/account-settings-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const admin = createAdminClient();
  const clipper = !!viewer.creatorId && !viewer.brandId;
  const { data } = clipper
    ? await admin.from('creators').select('display_name, bio, avatar_url').eq('id', viewer.creatorId!).single()
    : await admin.from('brands').select('name, avatar_url').eq('id', viewer.brandId!).single();
  const row = (data ?? {}) as { display_name?: string; name?: string; bio?: string | null; avatar_url?: string | null };
  return (
    <AppLayout role={clipper ? 'clipper' : 'streamer'}>
      <PageHeader title="Settings" description="Your picture, name and account details." />
      <div className="max-w-2xl">
        <AccountSettingsForm name={row.display_name ?? row.name ?? ''} bio={row.bio ?? ''} avatar={row.avatar_url ?? null} email={viewer.email} clipper={clipper} />
        <p className="mt-6 text-sm text-zinc-500">
          Need to change your password? Use <Link href="/forgot" className="underline">reset password</Link>.
        </p>
      </div>
    </AppLayout>
  );
}
