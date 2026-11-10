import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { ForgotForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function ForgotPage() {
  if (isDemo) redirect('/streamer');
  return (
    <AuthShell title="Reset your password" subtitle="We’ll email you a code, then you pick a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
