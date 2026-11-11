'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { appUrl, isDemo } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
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

/** Starts an email change. Supabase sends a confirmation link; the change applies once it's opened. */
export async function changeEmail(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: 'Off in the demo.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: 'Enter a valid email address.' };
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (viewer.email?.toLowerCase() === email) return { error: 'That’s already your email.' };
  const { error } = await createClient().auth.updateUser({ email }, { emailRedirectTo: `${appUrl()}/account?tab=account` });
  if (error) return { error: error.message };
  return { success: `Check ${email} (and your current inbox) for a confirmation link. Your email changes once you open it.` };
}

/** Changes the password after checking the current one. */
export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: 'Off in the demo.' };
  const current = String(form.get('current') ?? '');
  const next = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (next.length < 8) return { error: 'Use at least 8 characters for the new password.' };
  if (next !== confirm) return { error: 'The new passwords don’t match.' };
  const viewer = await getViewer();
  if (!viewer?.email) redirect('/login');
  const supabase = createClient();
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: viewer.email, password: current });
  if (wrong) return { error: 'Your current password isn’t right.' };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { success: 'Password changed.' };
}
