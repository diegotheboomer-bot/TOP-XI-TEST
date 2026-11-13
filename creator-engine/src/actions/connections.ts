'use server';

// Disconnecting a platform account, and deleting the whole Atlas account.
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isDemo, requireEnv } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { selectAll } from '@/lib/fetch-all';
import { decryptSecret } from '@/lib/crypto';
import { MIN_CASHOUT } from '@/lib/payout-rules';
import { usdCents } from '@/lib/format';
import type { ActionState } from './result';

type Platform = 'tiktok' | 'youtube' | 'instagram';

/** Tells TikTok to drop our access, so the next connect asks again. Best effort. */
async function revokeTikTok(admin: SupabaseClient, creatorId: string): Promise<void> {
  try {
    const { data } = await admin.from('social_accounts').select('access_token_enc').eq('creator_id', creatorId).eq('platform', 'tiktok').maybeSingle();
    if (!data?.access_token_enc) return;
    // https://developers.tiktok.com/docs/en/oauth-revoke-a-user-access-token
    await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: requireEnv('TIKTOK_CLIENT_KEY'), client_secret: requireEnv('TIKTOK_CLIENT_SECRET'), token: decryptSecret(data.access_token_enc) }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // The row is deleted anyway; TikTok's own token simply expires.
  }
}

export async function disconnectPlatform(platform: Platform): Promise<ActionState> {
  if (isDemo) return { error: 'Not available in the demo.' };
  if (!['tiktok', 'youtube', 'instagram'].includes(platform)) return { error: 'Unknown platform.' };
  const viewer = await getViewer();
  if (!viewer?.creatorId) return { error: 'Sign in as a clipper first.' };
  const admin = createAdminClient();
  if (platform === 'tiktok') await revokeTikTok(admin, viewer.creatorId);
  const { error } = await admin.from('social_accounts').delete().eq('creator_id', viewer.creatorId).eq('platform', platform);
  if (error) return { error: 'Couldn’t disconnect. Try again.' };
  revalidatePath('/account');
  revalidatePath('/clipper');
  return { success: 'Disconnected.' };
}

/**
 * Deletes the signed-in account. Money records (clips, payouts, deposits) are kept for the other
 * side and for accounting, so the profile is anonymised and the login is removed instead of
 * deleting every row. Blocked while money is still owed to or held for the person.
 */
export async function deleteAccount(): Promise<ActionState> {
  if (isDemo) return { error: 'Not available in the demo.' };
  const viewer = await getViewer();
  if (!viewer) return { error: 'Sign in first.' };
  const admin = createAdminClient();

  if (viewer.creatorId) {
    const { data: subs } = await selectAll(() => admin.from('submissions').select('payout_earned, payout_transferred').eq('creator_id', viewer.creatorId!).order('id'));
    const owed = Math.round((subs ?? []).reduce((n, s) => n + Number(s.payout_earned) - Number(s.payout_transferred), 0) * 100) / 100;
    if (owed >= MIN_CASHOUT) return { error: `You still have ${usdCents(owed)} to cash out. Cash it out first, then delete your account.` };
  }
  if (viewer.brandId) {
    const { data: camps } = await admin.from('campaigns').select('escrow_balance, status').eq('brand_id', viewer.brandId);
    if ((camps ?? []).some((c) => c.status !== 'completed' && Number(c.escrow_balance) > 0)) {
      return { error: 'You have a campaign with budget left. End it first, so the unspent budget goes back to your card.' };
    }
    const { data: aff } = await admin.from('brand_affiliate_earnings').select('amount').eq('brand_id', viewer.brandId).eq('status', 'available');
    const balance = Math.round((aff ?? []).reduce((n, r) => n + Number(r.amount), 0) * 100) / 100;
    if (balance >= MIN_CASHOUT) return { error: `You have ${usdCents(balance)} in your affiliate balance. Cash it out or use it first.` };
  }

  if (viewer.creatorId) {
    await revokeTikTok(admin, viewer.creatorId);
    await admin.from('social_accounts').delete().eq('creator_id', viewer.creatorId);
    await admin.from('payout_methods').delete().eq('creator_id', viewer.creatorId);
    const { error } = await admin.from('creators').update({ display_name: 'Deleted account', bio: null, avatar_url: null, discord_id: null, discord_username: null }).eq('id', viewer.creatorId);
    if (error) return { error: 'Couldn’t delete your account. Try again, or contact support.' };
  }
  if (viewer.brandId) {
    const { error } = await admin.from('brands').update({ name: 'Deleted business', avatar_url: null }).eq('id', viewer.brandId);
    if (error) return { error: 'Couldn’t delete your account. Try again, or contact support.' };
  }
  await admin.from('user_devices').delete().eq('user_id', viewer.userId);
  // Soft delete keeps the user id that clips and payouts point to, but removes the login and email.
  const { error } = await admin.auth.admin.deleteUser(viewer.userId, true);
  if (error) return { error: 'Couldn’t delete your account. Try again, or contact support.' };
  await createClient().auth.signOut().catch(() => {});
  return { success: 'Your account is deleted.' };
}
