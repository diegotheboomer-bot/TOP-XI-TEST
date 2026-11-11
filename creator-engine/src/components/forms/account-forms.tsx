'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Check, MailCheck, Megaphone, Video, Building2 } from 'lucide-react';
import { checkHandoff, createProfile, resendCode, resetPassword, sendResetCode, signIn, signUp, verifySignupCode } from '@/actions/account';
import type { ActionState } from '@/actions/result';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';

export function SignInForm() {
  const [state, action] = useFormState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="h-11 w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot" className="text-zinc-500 hover:text-zinc-900">
          Forgot password?
        </Link>
        <Link href="/start" className="font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}

const roles = [
  { value: 'brand', icon: Megaphone, title: 'I stream', body: 'Run campaigns and pay clippers for real views.' },
  { value: 'creator', icon: Video, title: 'I clip', body: 'Clip streamers and get paid per view.' },
  { value: 'agency', icon: Building2, title: 'I run an agency', body: 'Run clipping campaigns for the streamers you manage.' },
] as const;
type Role = (typeof roles)[number]['value'];

function RoleCards({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <fieldset className="grid grid-cols-2 gap-3">
      <legend className="sr-only">Account type</legend>
      {roles.map((r) => {
        const on = role === r.value;
        return (
          <label
            key={r.value}
            className={cn(
              'relative flex cursor-pointer gap-3 rounded-xl border p-4 transition',
              r.value === 'agency' ? 'col-span-2 flex-row items-center pr-9' : 'flex-col',
              on ? 'border-brand-b/60 bg-brand-a/10 ring-4 ring-brand-a/10' : 'border-zinc-200 bg-white hover:border-zinc-300',
            )}
          >
            <input type="radio" name="role" value={r.value} checked={on} onChange={() => onChange(r.value)} className="sr-only" />
            <span className={cn('grid size-9 place-items-center rounded-xl transition', on ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
              <r.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{r.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{r.body}</span>
            </span>
            <span className={cn('absolute right-3 top-3 grid size-4 place-items-center rounded-full transition', on ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
              {on && <Check className="size-3" strokeWidth={3} />}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Sign up: pick a side, name, email, password, then the 6-digit code from the email. */
export function SignUpForm({ defaultRole = 'brand' }: { defaultRole?: Role }) {
  const [state, action] = useFormState(signUp, undefined);
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState('');
  if (state?.success) return <CodeStep email={email} kind="signup" />;
  return (
    <form action={action} className="space-y-4">
      <RoleCards role={role} onChange={setRole} />
      <Field label={role === 'brand' ? 'Channel name' : role === 'agency' ? 'Agency name' : 'Display name'}>
        <Input name="name" required minLength={2} autoComplete="nickname" placeholder={role === 'brand' ? 'Marlow Kade' : role === 'agency' ? 'Reach Clipping' : 'Rae'} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="h-11 w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-zinc-500">
        Have an account?{' '}
        <Link href="/login" className="font-medium text-zinc-900 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/** Forgot password: email → code + new password. */
export function ForgotForm() {
  const [state, action] = useFormState(sendResetCode, undefined);
  const [email, setEmail] = useState('');
  if (state?.success) return <CodeStep email={email} kind="recovery" />;
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="h-11 w-full" pendingText="Sending…">
        Email me a code
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="text-zinc-500 hover:text-zinc-900">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

/**
 * Enter the 6-digit code from the email (plus a new password when resetting).
 * For sign-up, tapping the email's button on any device also finishes here: this page waits and signs in by itself.
 */
function CodeStep({ email, kind }: { email: string; kind: 'signup' | 'recovery' }) {
  const router = useRouter();
  const [state, action] = useFormState(kind === 'signup' ? verifySignupCode : resetPassword, undefined);
  const [resent, setResent] = useState<ActionState>();

  useEffect(() => {
    if (kind !== 'signup') return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const { status } = await checkHandoff().catch(() => ({ status: 'waiting' as const }));
      if (status === 'signed_in') return router.push('/onboarding');
      if (status === 'waiting') setTimeout(tick, 2500);
    };
    const first = setTimeout(tick, 2500);
    return () => {
      stop = true;
      clearTimeout(first);
    };
  }, [kind, router]);

  return (
    <div>
      <div className="text-center">
        <MailCheck className="mx-auto size-9 text-[rgb(var(--brand-ta))]" />
        <p className="mt-3 font-medium">Check your email</p>
        <p className="mt-1 text-sm text-zinc-500">
          We sent a 6-digit code to <span className="text-zinc-900">{email}</span>.
        </p>
      </div>
      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="email" value={email} />
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          placeholder="000000"
          aria-label="Code from the email"
          className="h-12 text-center font-mono text-xl tracking-[0.4em]"
        />
        {kind === 'recovery' && (
          <Field label="New password">
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
          </Field>
        )}
        <FormMessage state={state ?? resent} />
        <SubmitButton className="h-11 w-full" pendingText="Checking…">
          {kind === 'signup' ? 'Confirm email' : 'Set password and sign in'}
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        No email? Check spam, or{' '}
        <button type="button" onClick={async () => setResent(await resendCode({ email, kind }))} className="font-medium text-zinc-900 underline">
          send a new code
        </button>
        .
      </p>
    </div>
  );
}

export function OnboardingForm({ defaultRole = 'brand' }: { defaultRole?: 'brand' | 'creator' }) {
  const [state, action] = useFormState(createProfile, undefined);
  const [role, setRole] = useState<Role>(defaultRole);
  return (
    <form action={action} className="space-y-5">
      <RoleCards role={role} onChange={setRole} />
      <Field label={role === 'brand' ? 'Channel name' : role === 'agency' ? 'Agency name' : 'Display name'}>
        <Input name="name" required minLength={2} placeholder={role === 'brand' ? 'Marlow Kade' : role === 'agency' ? 'Reach Clipping' : 'Rae'} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Setting up…">Continue</SubmitButton>
    </form>
  );
}
