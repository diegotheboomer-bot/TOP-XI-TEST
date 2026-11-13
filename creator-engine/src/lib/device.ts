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

/** How long a connection the account used counts as "theirs" for invite checks. */
export const NETWORK_DAYS = 14;

/**
 * Remembers that this account used this device, and (optional) this connection, stored as
 * `net:<hash>`. Never throws. Links opened inside Instagram/Discord/WhatsApp use those apps' own
 * browser with separate cookies, so the connection is what catches those.
 */
export async function recordDevice(admin: SupabaseClient, userId: string, hash: string | null, network?: string | null): Promise<void> {
  const now = new Date().toISOString();
  const rows = [hash, network ? `net:${network}` : null].filter((x): x is string => !!x).map((device_hash) => ({ user_id: userId, device_hash, last_seen: now }));
  if (!rows.length) return;
  try {
    await admin.from('user_devices').upsert(rows, { onConflict: 'user_id,device_hash' });
  } catch {
    // Best effort.
  }
}

/** Whether this account used this connection in the last NETWORK_DAYS days. */
export async function usedNetworkRecently(admin: SupabaseClient, userId: string, network: string | null): Promise<boolean> {
  if (!network) return false;
  const since = new Date(Date.now() - NETWORK_DAYS * 86_400_000).toISOString();
  const { count } = await admin.from('user_devices').select('user_id', { count: 'exact', head: true }).eq('user_id', userId).eq('device_hash', `net:${network}`).gte('last_seen', since);
  return (count ?? 0) > 0;
}

/** Whether this account has used this device before. */
export async function usedDevice(admin: SupabaseClient, userId: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  const { count } = await admin.from('user_devices').select('user_id', { count: 'exact', head: true }).eq('user_id', userId).eq('device_hash', hash);
  return (count ?? 0) > 0;
}
