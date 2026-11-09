'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Megaphone, Video } from 'lucide-react';
import { createProfile, sendMagicLink } from '@/actions/account';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';

export function LoginForm() {
  const [state, action] = useFormState(sendMagicLink, undefined);
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
              role === r.value ? 'border-zinc-900 bg-white ring-4 ring-zinc-900/5' : 'border-zinc-200 bg-white hover:border-zinc-300',
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
