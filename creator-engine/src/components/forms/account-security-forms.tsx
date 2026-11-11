'use client';

import { useFormState } from 'react-dom';
import { KeyRound, Mail } from 'lucide-react';
import { changeEmail, changePassword } from '@/actions/profile';
import { Card } from '../ui/card';
import { Field, Input } from '../ui/field';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';

/** Change email and change password, each its own small form. */
export function AccountSecurityForms({ email }: { email: string | null }) {
  const [emailState, emailAction] = useFormState(changeEmail, undefined);
  const [passState, passAction] = useFormState(changePassword, undefined);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <Mail className="size-4 text-[rgb(var(--brand-ta))]" /> Email
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as <b className="font-medium text-zinc-900">{email}</b>
        </p>
        <form action={emailAction} className="mt-4 space-y-3">
          <Field label="New email">
            <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </Field>
          <FormMessage state={emailState} />
          <div className="flex justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <SubmitButton pendingText="Sending…">Change email</SubmitButton>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <KeyRound className="size-4 text-[rgb(var(--brand-ta))]" /> Password
        </h2>
        <form action={passAction} className="mt-4 space-y-3">
          <Field label="Current password">
            <Input name="current" type="password" required autoComplete="current-password" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="New password" hint="At least 8 characters.">
              <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Repeat new password">
              <Input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
          </div>
          <FormMessage state={passState} />
          <div className="flex justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <SubmitButton pendingText="Saving…">Change password</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
