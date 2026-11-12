// Referrals: a clipper who invites another clipper gets the cash-out fee from that
// clipper's payouts for their first 90 days. Otherwise Atlas keeps the fee.
import type { SupabaseClient } from '@supabase/supabase-js';
import { stripe } from './stripe';
import { MIN_CASHOUT } from './payout-rules';
import { stripePayoutCost } from './payout-costs';
import { paidThisMonth, stripeOwnsPricing } from './stripe';

export const REFERRAL_DAYS = 90;
export const REFERRAL_COOKIE = 'atlas_ref';

export const validCode = (code: string | undefined | null) => !!code && /^[A-Z0-9]{6,12}$/.test(code);

/** True while the referred clipper is inside the inviter's 90 days. */
export const inReferralWindow = (joinedAt: string, now = Date.now()) => now - new Date(joinedAt).getTime() < REFERRAL_DAYS * 86_400_000;

/** The inviter's creator id for a code, if it's a real clipper. */
export async function referrerFor(admin: SupabaseClient, code: string | undefined): Promise<string | null> {
  const c = code?.trim().toUpperCase();
  if (!validCode(c)) return null;
  const { data } = await admin.from('creators').select('id').eq('referral_code', c).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * After a clip payout with a fee: if the clipper was invited and is inside the 90 days,
 * record the fee as the inviter's, then try to send it. Never throws: a failure here
 * must not undo the clipper's own payout.
 */
export async function creditReferral(admin: SupabaseClient, input: { creatorId: string; submissionId: string; fee: number; sourceRef: string }): Promise<void> {
  if (!(input.fee > 0)) return;
  try {
    const { data: c } = await admin.from('creators').select('referred_by, created_at').eq('id', input.creatorId).single();
    if (!c?.referred_by || c.referred_by === input.creatorId || !inReferralWindow(c.created_at as string)) return;
    const { error } = await admin
      .from('referral_earnings')
      .insert({ referrer_id: c.referred_by, referred_id: input.creatorId, submission_id: input.submissionId, amount: input.fee, source_ref: input.sourceRef });
    if (error) return; // duplicate source_ref: already credited
    await payReferralEarnings(admin, c.referred_by as string);
  } catch {
    // Left unpaid; the scheduled sync retries.
  }
}

/**
 * Sends an inviter everything they're owed in one Stripe transfer, once their payout
 * account is ready. Rows are claimed first so two runs can't pay the same money twice.
 */
export async function payReferralEarnings(admin: SupabaseClient, referrerId: string): Promise<number> {
  const { data: who } = await admin.from('creators').select('stripe_account_id, payouts_enabled').eq('id', referrerId).single();
  if (!who?.stripe_account_id || !who.payouts_enabled) return 0;
  // Sent once it adds up to the minimum cash-out, like a clipper's own earnings.
  const { data: owed } = await admin.from('referral_earnings').select('amount').eq('referrer_id', referrerId).is('transfer_id', null);
  if ((owed ?? []).reduce((n, r) => n + Number(r.amount), 0) < MIN_CASHOUT) return 0;
  const claim = `claim:${crypto.randomUUID()}`;
  const { data: rows } = await admin.from('referral_earnings').update({ transfer_id: claim }).eq('referrer_id', referrerId).is('transfer_id', null).select('id, amount');
  if (!rows?.length) return 0;
  const total = Math.round(rows.reduce((n, r) => n + Number(r.amount), 0) * 100) / 100;
  try {
    // Stripe's payout charge comes off, as on any cash-out.
    const acct = who.stripe_account_id as string;
    const free = await stripeOwnsPricing(acct).catch(() => false);
    const first = !free && !(await paidThisMonth(acct).catch(() => false));
    const send = free ? total : Math.round((total - stripePayoutCost(total, first)) * 100) / 100;
    if (send <= 0) throw new Error('too small');
    const transfer = await stripe().transfers.create(
      { amount: Math.round(send * 100), currency: 'usd', destination: who.stripe_account_id as string, metadata: { kind: 'referral', referrer_id: referrerId, earned: String(total) } },
      { idempotencyKey: `referral_${claim}` },
    );
    await admin.from('referral_earnings').update({ transfer_id: transfer.id, paid_at: new Date().toISOString() }).eq('transfer_id', claim);
    return total;
  } catch {
    await admin.from('referral_earnings').update({ transfer_id: null }).eq('transfer_id', claim);
    return 0;
  }
}

/** Pays every inviter who's owed money (run by the scheduled sync). */
export async function payAllReferralEarnings(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from('referral_earnings').select('referrer_id').is('transfer_id', null).limit(1000);
  let paid = 0;
  for (const id of new Set((data ?? []).map((r) => r.referrer_id as string))) if ((await payReferralEarnings(admin, id)) > 0) paid++;
  return paid;
}
