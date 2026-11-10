import { redirect } from 'next/navigation';
import { Logo } from '@/components/site-header';
import { Card } from '@/components/ui/card';
import { LoginForm } from '@/components/forms/account-forms';
import { isDemo } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (isDemo) redirect('/streamer');
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-zinc-500">We’ll email you a one-time sign-in link. No password needed.</p>
          {searchParams.error && <p className="mb-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">That link didn’t work or has expired. Request a new one below.</p>}
          <LoginForm />
          <p className="mt-4 text-xs text-zinc-500">
            By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </Card>
      </div>
    </main>
  );
}
