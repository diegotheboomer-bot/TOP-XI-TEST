'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { EmailOtpType } from '@supabase/supabase-js';
import { isDemo, appUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resetDemo } from '@/lib/demo';
import { DEMO_ERROR, type ActionState } from './result';

export async function sendMagicLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = z.string().trim().email().safeParse(form.get('email'));
  if (!email.success) return { error: 'Enter a valid email address.' };
  // The page that asked waits on this id (cookie) and finishes signing in once
  // the emailed link is confirmed, in any browser (see confirmHandoff).
  const handoff = crypto.randomUUID();
  await createAdminClient().from('login_handoffs').insert({ id: handoff });
  const { error } = await createClient().auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${appUrl()}/auth/confirm?handoff=${handoff}` },
  });
  if (error) return { error: error.message };
  cookies().set(HANDOFF_COOKIE, handoff, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  return { success: 'Check your inbox for a sign-in link.' };
}

const HANDOFF_COOKIE = 'login_handoff';
const OTP_TYPES: EmailOtpType[] = ['email', 'signup', 'magiclink', 'invite', 'email_change'];
const otpType = (t: string | null | undefined): EmailOtpType => ((OTP_TYPES as string[]).includes(t ?? '') ? (t as EmailOtpType) : 'email');
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

/**
 * Pressed Continue on the emailed link. With a handoff id, the token is passed
 * to the page that asked (it signs in there) and this tab can be closed.
 * Without one (older emails), signs in right here.
 */
export async function confirmHandoff(input: { tokenHash: string; type: string; handoff: string }): Promise<{ status: 'handed_off' | 'signed_in' | 'invalid' }> {
  if (isDemo || !input.tokenHash) return { status: 'invalid' };
  const type = otpType(input.type);
  if (input.handoff && isUuid(input.handoff)) {
    const { data } = await createAdminClient()
      .from('login_handoffs')
      .update({ token_hash: input.tokenHash, otp_type: type, approved_at: new Date().toISOString() })
      .eq('id', input.handoff)
      .is('used_at', null)
      .gt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .select('id');
    if (data?.length) return { status: 'handed_off' };
  }
  const { error } = await createClient().auth.verifyOtp({ token_hash: input.tokenHash, type });
  return { status: error ? 'invalid' : 'signed_in' };
}

/** Sign in in this tab instead (the person closed the page that asked). */
export async function signInHere(input: { tokenHash: string; type: string; handoff: string }): Promise<{ ok: boolean }> {
  if (isDemo) return { ok: false };
  if (isUuid(input.handoff)) {
    const { data } = await createAdminClient().from('login_handoffs').update({ used_at: new Date().toISOString() }).eq('id', input.handoff).is('used_at', null).select('id');
    if (!data?.length) return { ok: false };
  }
  const { error } = await createClient().auth.verifyOtp({ token_hash: input.tokenHash, type: otpType(input.type) });
  return { ok: !error };
}

/** The code from the email, typed on the page that asked for it. */
export async function verifyEmailCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = z.string().trim().email().safeParse(form.get('email'));
  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  if (!email.success || code.length < 6) return { error: 'Enter the code from the email.' };
  const { error } = await createClient().auth.verifyOtp({ email: email.data, token: code, type: 'email' });
  if (error) return { error: 'That code is wrong or has expired.' };
  cookies().delete(HANDOFF_COOKIE);
  redirect('/onboarding');
}

/** Polled by the page that asked for the link: finishes signing in once the link is confirmed. */
export async function checkHandoff(): Promise<{ status: 'waiting' | 'signed_in' | 'failed' }> {
  if (isDemo) return { status: 'failed' };
  const handoff = cookies().get(HANDOFF_COOKIE)?.value;
  if (!handoff || !isUuid(handoff)) return { status: 'failed' };
  // Claim it once, so the token is only ever used by one page.
  const { data } = await createAdminClient()
    .from('login_handoffs')
    .update({ used_at: new Date().toISOString() })
    .eq('id', handoff)
    .not('approved_at', 'is', null)
    .is('used_at', null)
    .select('token_hash, otp_type');
  const row = data?.[0];
  if (!row?.token_hash) {
    const { data: still } = await createAdminClient().from('login_handoffs').select('used_at').eq('id', handoff).maybeSingle();
    return { status: still && !still.used_at ? 'waiting' : 'failed' };
  }
  cookies().delete(HANDOFF_COOKIE);
  const { error } = await createClient().auth.verifyOtp({ token_hash: row.token_hash, type: otpType(row.otp_type) });
  return { status: error ? 'failed' : 'signed_in' };
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
