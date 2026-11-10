'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { MailCheck, Megaphone, Video } from 'lucide-react';
import { checkHandoff, createProfile, sendMagicLink, verifyEmailCode } from '@/actions/account';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';

export function LoginForm() {
  const [state, action] = useFormState(sendMagicLink, undefined);
  const [email, setEmail] = useState('');
  if (state?.success) return <WaitingForEmail email={email} />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Sending…">Email me a sign-in code</SubmitButton>
    </form>
  );
}

/**
 * After the email is sent: type the code here, or tap the link in the email
 * (any device) and this page signs in by itself.
 */
function WaitingForEmail({ email }: { email: string }) {
  const router = useRouter();
  const [codeState, verify] = useFormState(verifyEmailCode, undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const { status } = await checkHandoff().catch(() => ({ status: 'waiting' as const }));
      if (status === 'signed_in') return router.push('/onboarding');
      if (status === 'failed') return setFailed(true);
      setTimeout(tick, 2500);
    };
    const first = setTimeout(tick, 2500);
    return () => {
      stop = true;
      clearTimeout(first);
    };
  }, [router]);
  return (
    <div>
      <div className="text-center">
        <MailCheck className="mx-auto size-9 text-[rgb(var(--brand-ta))]" />
        <p className="mt-3 font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-zinc-500">
          We sent a code to <span className="text-zinc-900">{email}</span>.
        </p>
      </div>
      <form action={verify} className="mt-5 space-y-3">
        <input type="hidden" name="email" value={email} />
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          placeholder="Code"
          aria-label="Code from the email"
          className="h-12 text-center font-mono text-xl tracking-[0.4em]"
        />
        <FormMessage state={codeState} />
        <SubmitButton className="h-11 w-full" pendingText="Checking…">
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        {failed ? 'Or use the button in the email.' : 'Or tap the button in the email. This page signs in by itself.'}
      </p>
    </div>
  );
}

const roles = [
  { value: 'brand', icon: Megaphone, title: 'I stream', body: 'Run campaigns and pay clippers for real views.' },
  { value: 'creator', icon: Video, title: 'I clip', body: 'Clip streamers and get paid per view.' },
] as const;

export function OnboardingForm({ defaultRole = 'brand' }: { defaultRole?: 'brand' | 'creator' }) {
  const [state, action] = useFormState(createProfile, undefined);
  const [role, setRole] = useState<'brand' | 'creator'>(defaultRole);
  return (
    <form action={action} className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Account type</legend>
        {roles.map((r) => (
          <label
            key={r.value}
            className={cn(
              'flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition',
              role === r.value ? 'border-brand-a bg-white ring-4 ring-brand-a/15' : 'border-zinc-200 bg-white hover:border-zinc-300',
            )}
          >
            <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
            <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
              <r.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{r.title}</span>
              <span className="mt-0.5 block text-sm text-zinc-500">{r.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field label={role === 'brand' ? 'Channel name' : 'Display name'}>
        <Input name="name" required minLength={2} placeholder={role === 'brand' ? 'Marlow Kade' : 'Rae'} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Setting up…">Continue</SubmitButton>
    </form>
  );
}
