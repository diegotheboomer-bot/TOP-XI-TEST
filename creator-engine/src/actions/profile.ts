'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDemo } from '@/lib/env';
import { THUMBNAIL_TYPES, thumbnailError } from '@/lib/schemas';
import type { ActionState } from './result';

/** Name, bio (clippers) and profile picture, for whichever side the person has. */
export async function updateAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: 'Editing is off in the demo.' };
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const parsed = z
    .object({ name: z.string().trim().min(2, 'Name is too short').max(120), bio: z.string().trim().max(280, 'Keep the bio under 280 characters').default('') })
    .safeParse({ name: form.get('name'), bio: form.get('bio') ?? '' });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const file = form.get('avatar');
  const pic = file instanceof File && file.size > 0 ? file : null;
  let avatar_url: string | null | undefined;
  if (pic) {
    if (!THUMBNAIL_TYPES.includes(pic.type)) return { error: 'Use a JPG, PNG or WebP image.' };
    const err = thumbnailError(pic);
    if (err) return { error: err.replace('Thumbnail', 'Picture') };
    const path = `${viewer.userId}/${crypto.randomUUID()}.${pic.type.split('/')[1].replace('jpeg', 'jpg')}`;
    const { error } = await admin.storage.from('avatars').upload(path, pic, { contentType: pic.type });
    if (error) return { error: `Upload failed: ${error.message}` };
    avatar_url = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }
  if (form.get('remove_avatar') === 'on') avatar_url = null;

  const pictureChange = avatar_url !== undefined ? { avatar_url } : {};
  if (viewer.creatorId) {
    const { error } = await admin.from('creators').update({ display_name: parsed.data.name, bio: parsed.data.bio || null, ...pictureChange }).eq('id', viewer.creatorId);
    if (error) return { error: error.message };
  }
  if (viewer.brandId) {
    const { error } = await admin.from('brands').update({ name: parsed.data.name, ...pictureChange }).eq('id', viewer.brandId);
    if (error) return { error: error.message };
  }
  revalidatePath('/', 'layout');
  return { success: 'Saved.' };
}

/** The after-sign-up questions. Skipping still marks them done so they don't come back. */
export async function saveWelcome(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: 'Off in the demo.' };
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const interests = form.getAll('interests').map(String).filter(Boolean).slice(0, 20);
  const heard = String(form.get('heard_from') ?? '').trim().slice(0, 60) || null;
  const row = { interests, heard_from: heard, onboarded_at: new Date().toISOString() };
  const admin = createAdminClient();
  if (viewer.creatorId) await admin.from('creators').update(row).eq('id', viewer.creatorId);
  if (viewer.brandId) await admin.from('brands').update(row).eq('id', viewer.brandId);
  redirect(viewer.brandId ? '/streamer' : '/clipper');
}

export async function skipWelcome(): Promise<void> {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  const admin = createAdminClient();
  const row = { onboarded_at: new Date().toISOString() };
  if (viewer.creatorId) await admin.from('creators').update(row).eq('id', viewer.creatorId);
  if (viewer.brandId) await admin.from('brands').update(row).eq('id', viewer.brandId);
  redirect(viewer.brandId ? '/streamer' : '/clipper');
}

/** Unlinks the clipper's Discord account (their Discord roles stop updating). */
export async function disconnectDiscord(): Promise<void> {
  if (isDemo) redirect('/');
  const viewer = await getViewer();
  if (!viewer?.creatorId) redirect('/login');
  await createAdminClient().from('creators').update({ discord_id: null, discord_username: null }).eq('id', viewer.creatorId);
  redirect('/account?discord=disconnected');
}
