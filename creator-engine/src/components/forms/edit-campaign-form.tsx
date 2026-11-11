'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Image as ImageIcon } from 'lucide-react';
import { referenceUploadUrl, updateCampaign } from '@/actions/brand';
import { THUMBNAIL_TYPES, thumbnailError } from '@/lib/schemas';
import type { Campaign } from '@/lib/types';
import { Card } from '../ui/card';
import { Field, Input } from '../ui/field';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { CategoryPicker } from './campaign-form-body';
import { InstructionsFields } from './campaign-fields';

/** Change a campaign's look and instructions. Pay terms stay as they were. */
export function EditCampaignForm({ campaign: c }: { campaign: Campaign }) {
  const [state, action] = useFormState(updateCampaign.bind(null, c.id), undefined);
  const [category, setCategory] = useState(c.category ?? 'Gaming');
  const [thumb, setThumb] = useState<string | null>(c.thumbnail_url);
  const [thumbError, setThumbError] = useState('');
  return (
    <form action={action} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Look</h2>
        <label className="group relative mb-5 grid aspect-[16/9] max-w-md cursor-pointer place-items-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
          <input
            type="file"
            name="thumbnail"
            accept={THUMBNAIL_TYPES.join(',')}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0];
              const err = thumbnailError(f);
              setThumbError(err ?? '');
              setThumb(f && !err ? URL.createObjectURL(f) : c.thumbnail_url);
              if (err) e.target.value = '';
            }}
          />
          {thumb && <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <ImageIcon className="size-3.5" /> Change thumbnail
          </span>
        </label>
        {thumbError && <p className="-mt-3 mb-4 text-sm text-rose-600">{thumbError}</p>}
        {c.client_name ? (
          <Field label="Streamer you’re running this for" className="mb-4">
            <Input name="client_name" required minLength={2} maxLength={120} defaultValue={c.client_name} />
          </Field>
        ) : (
          <input type="hidden" name="client_name" value="" />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label="Title">
            <Input name="title" required minLength={3} maxLength={80} defaultValue={c.title} />
          </Field>
          <Field label="Category">
            <CategoryPicker value={category} onChange={setCategory} />
          </Field>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Instructions</h2>
        <InstructionsFields
          uploadUrl={referenceUploadUrl}
          brief={c.brief ?? ''}
          initialRules={c.requirements}
          initialRefs={c.reference_items ?? []}
          assetFolderUrl={c.asset_folder_url ?? ''}
          momentsEnabled={!!c.moments_enabled}
          maxClips={c.max_clips_per_clipper ?? null}
          minTier={c.min_tier ?? 'silver'}
          inviteOnly={!!c.invite_only}
        />
      </Card>
      <p className="text-xs text-zinc-500">Pay terms can’t change once a campaign exists, so clippers always get what they signed up for.</p>
      <FormMessage state={state} />
      <div className="flex justify-end [&>button]:w-full sm:[&>button]:w-auto">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
