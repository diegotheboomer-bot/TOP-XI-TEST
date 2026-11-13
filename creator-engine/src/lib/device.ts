// A random ID per browser (set by the middleware in a long-lived cookie), stored only as a hash.
// Used for invite anti-fraud: an invite link opened on a device the inviter has used doesn't count.
// It can't see other sites or identify a person; a new browser or private window gets a new ID.
import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from './env';

export const DEVICE_COOKIE = 'atlas_device';

export function deviceHash(id: string | null | undefined): string | null {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return createHmac('sha256', requireEnv('TOKEN_ENCRYPTION_KEY')).update(`device:${id}`).digest('base64url').slice(0, 22);
}

/** Remembers that this account used this device. Never throws. */
export async function recordDevice(admin: SupabaseClient, userId: string, hash: string | null): Promise<void> {
  if (!hash) return;
  try {
    await admin.from('user_devices').upsert({ user_id: userId, device_hash: hash, last_seen: new Date().toISOString() }, { onConflict: 'user_id,device_hash' });
  } catch {
    // Best effort.
  }
}

/** Whether this account has used this device before. */
export async function usedDevice(admin: SupabaseClient, userId: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  const { count } = await admin.from('user_devices').select('user_id', { count: 'exact', head: true }).eq('user_id', userId).eq('device_hash', hash);
  return (count ?? 0) > 0;
}
