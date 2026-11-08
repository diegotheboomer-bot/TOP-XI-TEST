'use client';

import { useFormState } from 'react-dom';
import { submitVideo } from '@/actions/creator';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Input } from '../ui/field';

export function SubmitVideoForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState(submitVideo, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="videoUrl" type="url" required placeholder="https://www.tiktok.com/@you/video/…" aria-label="Live video link" className="sm:flex-1" />
        <SubmitButton pendingText="Verifying…">Submit video</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
