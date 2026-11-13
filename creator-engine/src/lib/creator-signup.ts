import { cookies, headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_COOKIE, referralFields, signupFingerprint } from './referrals';
import { DEVICE_COOKIE, deviceHash, recordDevice } from './device';

/** A new clipper row, with who invited them, a hash of the sign-up network and the device (for invite anti-fraud). */
export async function insertCreator(admin: SupabaseClient, userId: string, name: string) {
  const ip = signupFingerprint(headers().get('x-forwarded-for') ?? headers().get('x-real-ip'));
  const device = deviceHash(cookies().get(DEVICE_COOKIE)?.value);
  const invite = await referralFields(admin, cookies().get(REFERRAL_COOKIE)?.value, { ip, device });
  await recordDevice(admin, userId, device);
  return admin.from('creators').insert({ user_id: userId, display_name: name, signup_fingerprint: ip, ...invite });
}
