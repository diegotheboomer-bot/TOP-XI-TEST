'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { MailCheck, Megaphone, Video } from 'lucide-react';
import { checkHandoff, createProfile, sendMagicLink } from '@/actions/account';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';

export function LoginForm() {
  const [state, action] = useFormState(sendMagicLink, undefined);
  if (state?.success) return <WaitingForEmail />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}

/** After the link is sent: waits here and signs in once the emailed link is confirmed, from any device. */
function WaitingForEmail() {
  const router = useRouter();
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
    <div className="text-center">
      <MailCheck className="mx-auto size-9 text-[rgb(var(--brand-ta))]" />
      <p className="mt-3 font-medium">Check your inbox</p>
      <p className="mt-1 text-sm text-zinc-500">
        {failed ? 'This page stopped waiting. Open the link from the email to sign in.' : 'Open the link on any device and press Continue. This page signs you in automatically.'}
      </p>
      {!failed && <span className="mx-auto mt-4 block size-4 animate-spin rounded-full border-2 border-zinc-300 border-r-transparent" aria-label="Waiting" />}
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
