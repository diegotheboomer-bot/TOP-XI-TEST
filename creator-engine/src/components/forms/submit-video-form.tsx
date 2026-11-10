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
        <Input name="videoUrl" type="url" required placeholder="Link to your clip on TikTok, Shorts or Reels" aria-label="Clip link" className="sm:flex-1" />
        <SubmitButton pendingText="Verifying…">Submit clip</SubmitButton>
      </div>
      <label className="flex items-start gap-2 text-xs text-zinc-500">
        <input type="checkbox" name="noPaidPromo" required className="mt-0.5 size-3.5 accent-[rgb(var(--brand-b))]" />
        <span>I haven’t paid and won’t pay to promote or boost this clip (TikTok Promote, ads or similar).</span>
      </label>
      <FormMessage state={state} />
    </form>
  );
}
