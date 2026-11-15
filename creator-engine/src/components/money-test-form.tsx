'use client';

import { useFormState } from 'react-dom';
import { creditTestEarning } from '@/actions/admin';
import { FormMessage } from './form-message';
import { SubmitButton } from './submit-button';
import { Input } from './ui/field';

/** Atlas team only: give a clipper a balance from a funded campaign, to test a real cash-out. */
export function MoneyTestForm({ campaigns }: { campaigns: { id: string; title: string; balance: number }[] }) {
  const [state, action] = useFormState(creditTestEarning, undefined);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm">
        <span className="text-zinc-500">Campaign the money comes from</span>
        <select id="mt-campaign" name="campaign" required className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm">
          {campaigns.length ? (
            campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (${c.balance.toFixed(2)} in budget)
              </option>
            ))
          ) : (
            <option value="">No funded campaign yet</option>
          )}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-zinc-500">Clipper’s sign-in email</span>
        <Input id="mt-email" name="email" type="email" required placeholder="your test clipper account" className="mt-1" />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-500">Amount ($)</span>
        <Input id="mt-amount" name="amount" inputMode="decimal" required defaultValue="6" className="mt-1" />
      </label>
      <FormMessage state={state} />
      <SubmitButton className="h-11 w-full" pendingText="Adding…" disabled={!campaigns.length}>
        Give this balance
      </SubmitButton>
    </form>
  );
}
