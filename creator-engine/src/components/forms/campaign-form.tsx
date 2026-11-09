'use client';

import { useFormState } from 'react-dom';
import { createCampaign } from '@/actions/brand';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { CampaignFormBody } from './campaign-form-body';

export function CampaignForm({ brandName }: { brandName: string }) {
  const [state, action] = useFormState(createCampaign, undefined);
  return (
    <form action={action}>
      <CampaignFormBody
        brandName={brandName}
        footer={
          <div className="space-y-3">
            <FormMessage state={state} />
            <div className="flex justify-end">
              <SubmitButton pendingText="Creating…">Create draft campaign</SubmitButton>
            </div>
          </div>
        }
      />
    </form>
  );
}
