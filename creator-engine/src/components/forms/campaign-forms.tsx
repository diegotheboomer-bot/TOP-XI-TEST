'use client';

import { useFormState } from 'react-dom';
import { connectStore, fundEscrow } from '@/actions/brand';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Input } from '../ui/field';

export function FundEscrowForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState(fundEscrow, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-zinc-400">$</span>
          <Input name="amount" type="number" min="50" step="1" required placeholder="2,000" aria-label="Deposit amount" className="pl-7" />
        </div>
        <SubmitButton pendingText="Opening…">Deposit</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function ConnectStoreForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState(connectStore, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex gap-2">
        <Input name="shopDomain" required placeholder="your-store.myshopify.com" aria-label="Shopify domain" className="min-w-0 flex-1" />
        <SubmitButton variant="secondary" pendingText="Saving…">Connect</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
