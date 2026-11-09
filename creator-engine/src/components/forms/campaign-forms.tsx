'use client';

import { useFormState } from 'react-dom';
import { connectStore, fundEscrow } from '@/actions/brand';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Input } from '../ui/field';
import { DepositFields } from './deposit-fields';

export function FundEscrowForm({ campaignId, feePercent }: { campaignId: string; feePercent: number }) {
  const [state, action] = useFormState(fundEscrow, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <DepositFields id={`deposit-${campaignId}`} feePercent={feePercent} submit={<SubmitButton pendingText="Opening…">Add budget</SubmitButton>} />
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
