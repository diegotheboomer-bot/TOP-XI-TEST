'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isDemo, appUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resetDemo } from '@/lib/demo';
import { DEMO_ERROR, type ActionState } from './result';

export async function sendMagicLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = z.string().trim().email().safeParse(form.get('email'));
  if (!email.success) return { error: 'Enter a valid email address.' };
  const { error } = await createClient().auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${appUrl()}/auth/callback` },
  });
  return error ? { error: error.message } : { success: 'Check your inbox for a sign-in link.' };
}

export async function createProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const input = z
    .object({ role: z.enum(['brand', 'creator']), name: z.string().trim().min(2, 'Name is too short').max(120) })
    .safeParse({ role: form.get('role'), name: form.get('name') });
  if (!input.success) return { error: input.error.issues[0].message };

  const { data } = await createClient().auth.getUser();
  if (!data.user) redirect('/login');

  const admin = createAdminClient();
  const { error } =
    input.data.role === 'brand'
      ? await admin.from('brands').insert({ owner_id: data.user.id, name: input.data.name })
      : await admin.from('creators').insert({ user_id: data.user.id, display_name: input.data.name });
  if (error && error.code !== '23505') return { error: error.message };
  redirect(input.data.role === 'brand' ? '/streamer' : '/clipper');
}

export async function resetDemoData() {
  if (isDemo) resetDemo();
  redirect('/streamer');
}

export async function signOut() {
  if (!isDemo) await createClient().auth.signOut();
  redirect('/');
}
