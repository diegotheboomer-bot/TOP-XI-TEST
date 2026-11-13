import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_COOKIE, referralFields, signupFingerprint } from './referrals';

/** A new clipper row, with who invited them and a hash of the sign-up network (for invite anti-fraud). */
export async function insertCreator(admin: SupabaseClient, userId: string, name: string) {
  const fingerprint = signupFingerprint(headers().get('x-forwarded-for') ?? headers().get('x-real-ip'));
  const invite = await referralFields(admin, cookies().get(REFERRAL_COOKIE)?.value, fingerprint);
  return admin.from('creators').insert({ user_id: userId, display_name: name, signup_fingerprint: fingerprint, ...invite });
}
