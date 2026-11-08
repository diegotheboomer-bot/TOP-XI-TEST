import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret, encryptSecret } from './crypto';
import { refreshTikTokToken } from './platforms/tiktok';

/** Returns a valid TikTok access token for a creator, refreshing it if it expires within 5 minutes. */
export async function getTikTokAccessToken(admin: SupabaseClient, creatorId: string): Promise<string> {
  const { data: acct, error } = await admin
    .from('social_accounts')
    .select('id, access_token_enc, refresh_token_enc, access_expires_at')
    .eq('creator_id', creatorId)
    .eq('platform', 'tiktok')
    .maybeSingle();
  if (error) throw error;
  if (!acct) throw new Error('Creator has not connected TikTok');

  if (new Date(acct.access_expires_at).getTime() - Date.now() > 5 * 60_000) {
    return decryptSecret(acct.access_token_enc);
  }
  if (!acct.refresh_token_enc) throw new Error('TikTok token expired and no refresh token stored');

  const t = await refreshTikTokToken(decryptSecret(acct.refresh_token_enc));
  const now = Date.now();
  await admin
    .from('social_accounts')
    .update({
      access_token_enc: encryptSecret(t.access_token),
      refresh_token_enc: encryptSecret(t.refresh_token),
      access_expires_at: new Date(now + t.expires_in * 1000).toISOString(),
      refresh_expires_at: new Date(now + t.refresh_expires_in * 1000).toISOString(),
      updated_at: new Date(now).toISOString(),
    })
    .eq('id', acct.id);
  return t.access_token;
}
