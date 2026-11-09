'use client';

import { useFormState } from 'react-dom';
import { addMoment } from '@/actions/brand';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { MomentFields } from './moment-fields';

export function MomentForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState(addMoment, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <MomentFields idPrefix={campaignId} submit={<SubmitButton variant="secondary" pendingText="Pinning…">Pin moment</SubmitButton>} />
      <FormMessage state={state} />
    </form>
  );
}
