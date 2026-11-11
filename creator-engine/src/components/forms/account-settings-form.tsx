'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Camera } from 'lucide-react';
import { updateAccount } from '@/actions/profile';
import { THUMBNAIL_TYPES } from '@/lib/schemas';
import { Card } from '../ui/card';
import { Field, Input } from '../ui/field';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { StreamerAvatar } from '../views';

export function AccountSettingsForm({ name, bio, avatar, email, clipper }: { name: string; bio: string; avatar: string | null; email: string | null; clipper: boolean }) {
  const [state, action] = useFormState(updateAccount, undefined);
  const [preview, setPreview] = useState<string | null>(avatar);
  const [remove, setRemove] = useState(false);
  return (
    <form action={action} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Profile</h2>
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <StreamerAvatar name={name || '?'} size="lg" src={remove ? null : preview} />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
              <Camera className="size-5" />
            </span>
            <input
              type="file"
              name="avatar"
              accept={THUMBNAIL_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPreview(URL.createObjectURL(f));
                  setRemove(false);
                }
              }}
            />
          </label>
          <div className="text-sm">
            <p className="font-medium">Profile picture</p>
            <p className="text-xs text-zinc-500">Tap the picture to change it. JPG, PNG or WebP, up to 2 MB.</p>
            {(preview || avatar) && (
              <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <input type="checkbox" name="remove_avatar" checked={remove} onChange={(e) => setRemove(e.target.checked)} /> Remove picture
              </label>
            )}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <Field label={clipper ? 'Display name' : 'Name or brand'}>
            <Input name="name" required minLength={2} maxLength={120} defaultValue={name} />
          </Field>
          {clipper && (
            <Field label="Bio" hint="One or two lines streamers see on your profile.">
              <textarea name="bio" maxLength={280} rows={2} defaultValue={bio} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" placeholder="Gaming clipper. Fast edits, captions, 9:16." />
            </Field>
          )}
          <Field label="Email">
            <Input value={email ?? ''} disabled readOnly />
          </Field>
        </div>
      </Card>
      <FormMessage state={state} />
      <div className="flex justify-end [&>button]:w-full sm:[&>button]:w-auto">
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
