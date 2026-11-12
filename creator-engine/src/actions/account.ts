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
import { REFERRAL_COOKIE, referrerFor } from '@/lib/referrals';

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const Password = z.string().min(8, 'Use at least 8 characters for your password.').max(72);
const Role = z.enum(['brand', 'creator', 'agency']);
const Name = z.string().trim().min(2, 'Name is too short').max(120);

/** Starts a handoff the waiting page can finish if the person taps the email's button instead of typing the code. */
async function startHandoff(): Promise<string> {
  const handoff = crypto.randomUUID();
  await createAdminClient().from('login_handoffs').insert({ id: handoff });
  cookies().set(HANDOFF_COOKIE, handoff, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  return handoff;
}

/** Sign up: role, name, email, password. Sends a 6-digit code to confirm the email. */
export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const input = z
    .object({ role: Role, name: Name, email: Email, password: Password })
    .safeParse({ role: form.get('role'), name: form.get('name'), email: form.get('email'), password: form.get('password') });
  if (!input.success) return { error: input.error.issues[0].message };
  const handoff = await startHandoff();
  const { data, error } = await createClient().auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: { data: { role: input.data.role, name: input.data.name }, emailRedirectTo: `${appUrl()}/auth/confirm?handoff=${handoff}` },
  });
  if (error) return { error: error.message };
  // Supabase answers an existing, confirmed email with a user that has no identities.
  if (data.user && !data.user.identities?.length) return { error: 'There’s already an account with this email. Sign in instead.' };
  if (data.session) redirect('/onboarding'); // email confirmation turned off
  return { success: 'code_sent' };
}

/** The 6-digit code from the sign-up email, typed on the sign-up page. */
export async function verifySignupCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = Email.safeParse(form.get('email'));
  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  if (!email.success || code.length < 6) return { error: 'Enter the 6-digit code from the email.' };
  const supabase = createClient();
  let { error } = await supabase.auth.verifyOtp({ email: email.data, token: code, type: 'email' });
  if (error) ({ error } = await supabase.auth.verifyOtp({ email: email.data, token: code, type: 'signup' }));
  if (error) return { error: 'That code is wrong or has expired.' };
  cookies().delete(HANDOFF_COOKIE);
  redirect('/onboarding');
}

export async function resendCode(input: { email: string; kind: 'signup' | 'recovery' }): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = Email.safeParse(input.email);
  if (!email.success) return { error: 'Enter a valid email address.' };
  const supabase = createClient();
  const handoff = cookies().get(HANDOFF_COOKIE)?.value;
  const { error } =
    input.kind === 'signup'
      ? await supabase.auth.resend({ type: 'signup', email: email.data, options: { emailRedirectTo: `${appUrl()}/auth/confirm${handoff && isUuid(handoff) ? `?handoff=${handoff}` : '?'}` } })
      : await supabase.auth.resetPasswordForEmail(email.data);
  return error ? { error: error.message } : { success: 'Sent a new code.' };
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const input = z.object({ email: Email, password: z.string().min(1, 'Enter your password.') }).safeParse({ email: form.get('email'), password: form.get('password') });
  if (!input.success) return { error: input.error.issues[0].message };
  const { error } = await createClient().auth.signInWithPassword(input.data);
  if (error?.code === 'email_not_confirmed') return { error: 'Confirm your email first: use the code we sent when you signed up, or sign up again to get a new one.' };
  if (error) return { error: 'Wrong email or password. No password yet? Use “Forgot password” to set one.' };
  redirect('/onboarding');
}

/** Forgot password, step 1: email a 6-digit code. Same answer whether or not the account exists. */
export async function sendResetCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = Email.safeParse(form.get('email'));
  if (!email.success) return { error: email.error.issues[0].message };
  const { error } = await createClient().auth.resetPasswordForEmail(email.data);
  if (error && error.status === 429) return { error: 'Too many emails. Wait a minute and try again.' };
  return { success: 'code_sent' };
}

/** Forgot password, step 2: code from the email plus a new password. Signs in. */
export async function resetPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: DEMO_ERROR };
  const email = Email.safeParse(form.get('email'));
  const password = Password.safeParse(form.get('password'));
  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  if (!email.success || code.length < 6) return { error: 'Enter the 6-digit code from the email.' };
  if (!password.success) return { error: password.error.issues[0].message };
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code, type: 'recovery' });
  if (error) return { error: 'That code is wrong or has expired.' };
  const { error: updateError } = await supabase.auth.updateUser({ password: password.data });
  if (updateError) return { error: updateError.message };
  redirect('/onboarding');
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
    .object({ role: Role, name: z.string().trim().min(2, 'Name is too short').max(120) })
    .safeParse({ role: form.get('role'), name: form.get('name') });
  if (!input.success) return { error: input.error.issues[0].message };

  const { data } = await createClient().auth.getUser();
  if (!data.user) redirect('/login');

  const admin = createAdminClient();
  const { error } =
    input.data.role !== 'creator'
      ? await admin.from('brands').insert({ owner_id: data.user.id, name: input.data.name, kind: input.data.role === 'agency' ? 'agency' : 'streamer' })
      : await admin.from('creators').insert({ user_id: data.user.id, display_name: input.data.name, referred_by: await referrerFor(admin, cookies().get(REFERRAL_COOKIE)?.value) });
  if (error && error.code !== '23505') return { error: error.message };
  redirect('/welcome');
}

/** "Continue with Google / Apple": Supabase sends them to the provider and back to /auth/callback. */
export async function oauthSignIn(form: FormData): Promise<void> {
  if (isDemo) redirect('/');
  const provider = form.get('provider') === 'apple' ? 'apple' : 'google';
  const role = Role.safeParse(form.get('role'));
  const next = new URL(`${appUrl()}/auth/callback`);
  if (role.success) next.searchParams.set('role', role.data);
  const { data, error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo: next.toString() } });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}

export async function resetDemoData() {
  if (isDemo) resetDemo();
  redirect('/streamer');
}

export async function signOut() {
  if (!isDemo) await createClient().auth.signOut();
  redirect('/');
}
