import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Atlas credit: unspent budget a business kept on Atlas when it cancelled a campaign, to use on another one.
// Stored as brand_affiliate_earnings rows whose source_ref starts with 'credit:'. It never goes back to a card
// or a bank, and it is kept apart from invite earnings (which can be cashed out).
export const CREDIT_PREFIX = 'credit:';

export async function creditBalance(admin: SupabaseClient, brandId: string): Promise<number> {
  const { data } = await admin.from('brand_affiliate_earnings').select('amount').eq('brand_id', brandId).eq('status', 'available').like('source_ref', `${CREDIT_PREFIX}%`);
  return Math.round((data ?? []).reduce((n, r) => n + Number(r.amount), 0) * 100) / 100;
}

/** Moves `cents` out of a campaign's budget (already debited) into the business's Atlas credit. */
export async function keepAsCredit(admin: SupabaseClient, brandId: string, campaignId: string, cents: number): Promise<boolean> {
  const id = randomUUID();
  const { error } = await admin.from('brand_affiliate_earnings').insert({ brand_id: brandId, amount: cents / 100, source_ref: `${CREDIT_PREFIX}${campaignId}:${id}`, status: 'available' });
  if (error) return false;
  // Shown as money leaving the campaign, so its totals stay right.
  await admin.from('escrow_ledger').insert({ campaign_id: campaignId, entry_type: 'refund', amount: cents / 100, stripe_object_id: `${CREDIT_PREFIX}${id}` });
  return true;
}
