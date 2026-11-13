// Referrals: a clipper who invites another clipper gets the cash-out fee from that
// clipper's payouts for their first 90 days. Otherwise Atlas keeps the fee.
// Businesses have invite links too (codes start with BR): the fee is added to their
// campaign budget instead of paid out.
// Anti-fraud (people inviting their own second account to get their fee back):
// - an invite from the same sign-up network as the inviter doesn't count;
// - rewards are blocked when both accounts pay out to the same bank account or PayPal.
import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from './env';
import { usedDevice, usedNetworkRecently } from './device';
import { stripe } from './stripe';
import { MIN_CASHOUT } from './payout-rules';
import { stripePayoutCost } from './payout-costs';
import { paidThisMonth, stripeOwnsPricing } from './stripe';

export const REFERRAL_DAYS = 90;
export const REFERRAL_COOKIE = 'atlas_ref';

export const validCode = (code: string | undefined | null) => !!code && /^[A-Z0-9]{6,12}$/.test(code);

/** True while the referred clipper is inside the inviter's 90 days. */
export const inReferralWindow = (joinedAt: string, now = Date.now()) => now - new Date(joinedAt).getTime() < REFERRAL_DAYS * 86_400_000;

/** A business can use its invite link only once it has funded a campaign (a real deposit). */
export async function brandCanInvite(admin: SupabaseClient, brandId: string): Promise<boolean> {
  const { data: camps } = await admin.from('campaigns').select('id').eq('brand_id', brandId);
  const ids = (camps ?? []).map((c) => c.id as string);
  if (!ids.length) return false;
  const { count } = await admin.from('escrow_ledger').select('id', { count: 'exact', head: true }).eq('entry_type', 'deposit').in('campaign_id', ids);
  return (count ?? 0) > 0;
}

/** Business invite codes start with BR; clipper codes are 8 hex characters. */
export const isBrandCode = (code: string) => code.startsWith('BR');

/** A one-way hash of the sign-up network (IP), so two accounts made on the same connection can be matched without storing the IP. */
export function signupFingerprint(ip: string | null | undefined): string | null {
  const v = ip?.split(',')[0]?.trim();
  if (!v) return null;
  return createHmac('sha256', requireEnv('TOKEN_ENCRYPTION_KEY')).update(`ip:${v}`).digest('base64url').slice(0, 22);
}

/** The inviter behind a code: their user (for device checks) and who gets the reward. */
async function inviterFor(admin: SupabaseClient, code: string): Promise<{ userId: string; creatorId?: string; brandId?: string; signupFingerprint?: string | null } | null> {
  if (isBrandCode(code)) {
    const { data } = await admin.from('brands').select('id, owner_id').eq('referral_code', code).maybeSingle();
    return data?.id ? { userId: data.owner_id as string, brandId: data.id as string } : null;
  }
  const { data } = await admin.from('creators').select('id, user_id, signup_fingerprint').eq('referral_code', code).maybeSingle();
  return data?.id ? { userId: data.user_id as string, creatorId: data.id as string, signupFingerprint: data.signup_fingerprint as string | null } : null;
}

/**
 * True when an invite link is being used by the inviter themselves: they're signed in as the
 * inviter, it's opened on a device the inviter has used, or (clipper invites) from the inviter's
 * own sign-up network. Checked when the link is opened, so nothing is attached.
 */
export async function isSelfInvite(admin: SupabaseClient, code: string, ctx: { ip: string | null; device: string | null; viewerUserId?: string | null }): Promise<boolean> {
  const c = code.trim().toUpperCase();
  if (!validCode(c)) return false;
  const inviter = await inviterFor(admin, c);
  if (!inviter) return false;
  if (ctx.viewerUserId && ctx.viewerUserId === inviter.userId) return true;
  if (await usedDevice(admin, inviter.userId, ctx.device)) return true;
  if (await usedNetworkRecently(admin, inviter.userId, ctx.ip)) return true;
  return !!inviter.creatorId && !!ctx.ip && inviter.signupFingerprint === ctx.ip;
}

/**
 * Who a new clipper was invited by, from the invite cookie. Self-invites (see isSelfInvite) don't
 * count; businesses must have funded a campaign first.
 */
export async function referralFields(admin: SupabaseClient, code: string | undefined, ctx: { ip: string | null; device: string | null }): Promise<{ referred_by?: string; referred_by_brand?: string }> {
  const c = code?.trim().toUpperCase();
  if (!validCode(c)) return {};
  const inviter = await inviterFor(admin, c!);
  if (!inviter || (await isSelfInvite(admin, c!, ctx))) return {};
  if (inviter.brandId) return (await brandCanInvite(admin, inviter.brandId)) ? { referred_by_brand: inviter.brandId } : {};
  return { referred_by: inviter.creatorId! };
}

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
export async function creditReferral(admin: SupabaseClient, input: { creatorId: string; submissionId: string; campaignId?: string; fee: number; sourceRef: string }): Promise<void> {
  if (!(input.fee > 0)) return;
  try {
    const { data: c } = await admin.from('creators').select('referred_by, referred_by_brand, created_at').eq('id', input.creatorId).single();
    if (c?.referred_by_brand && inReferralWindow(c.created_at as string)) {
      await creditBrand(admin, c.referred_by_brand as string, input);
      return;
    }
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
 * A business's invite reward: the fee goes into one of its campaign budgets, as a
 * 'referral_credit' ledger row (never refunded to a card). The campaign the fee came from
 * if it's theirs and still running, otherwise their newest running campaign. With none
 * running, Atlas keeps the fee.
 */
async function creditBrand(admin: SupabaseClient, brandId: string, input: { campaignId?: string; fee: number; sourceRef: string }): Promise<void> {
  const { data: camps } = await admin.from('campaigns').select('id, status').eq('brand_id', brandId).in('status', ['active', 'paused']).order('created_at', { ascending: false });
  const open = camps ?? [];
  const target = open.find((x) => x.id === input.campaignId) ?? open.find((x) => x.status === 'active') ?? open[0];
  if (!target) return;
  const { error } = await admin
    .from('escrow_ledger')
    .insert({ campaign_id: target.id, entry_type: 'referral_credit', amount: input.fee, stripe_object_id: `refcredit:${input.sourceRef}` });
  if (error) return; // already credited (unique per payout)
  await admin.rpc('escrow_credit', { p_campaign: target.id, p_amount: input.fee });
}

/** Blocks rewards from invited accounts that pay out to the same bank account or PayPal as the inviter. */
async function blockSelfInvites(admin: SupabaseClient, referrerId: string, referrerAccount: string): Promise<void> {
  const { data: rows } = await admin.from('referral_earnings').select('referred_id').eq('referrer_id', referrerId).is('transfer_id', null);
  const referred = [...new Set((rows ?? []).map((r) => r.referred_id as string))];
  if (!referred.length) return;
  const banks = async (account: string | null) => {
    if (!account) return new Set<string>();
    const list = await stripe().accounts.listExternalAccounts(account, { limit: 10 }).catch(() => null);
    return new Set((list?.data ?? []).map((x) => (x as { fingerprint?: string | null }).fingerprint).filter((x): x is string => !!x));
  };
  const mine = await banks(referrerAccount);
  const [{ data: people }, { data: methods }] = await Promise.all([
    admin.from('creators').select('id, stripe_account_id').in('id', referred),
    admin.from('payout_methods').select('creator_id, handle').in('creator_id', [...referred, referrerId]),
  ]);
  const handleOf = new Map((methods ?? []).map((m) => [m.creator_id as string, (m.handle as string | null)?.toLowerCase() ?? null]));
  const myHandle = handleOf.get(referrerId);
  for (const p of people ?? []) {
    const theirs = await banks(p.stripe_account_id as string | null);
    const sameBank = [...theirs].some((f) => mine.has(f));
    const samePaypal = !!myHandle && handleOf.get(p.id as string) === myHandle;
    if (sameBank || samePaypal) {
      await admin
        .from('referral_earnings')
        .update({ transfer_id: 'blocked', blocked_reason: sameBank ? 'Same bank account as the inviter' : 'Same PayPal as the inviter' })
        .eq('referrer_id', referrerId)
        .eq('referred_id', p.id)
        .is('transfer_id', null);
    }
  }
}

/**
 * Sends an inviter everything they're owed in one Stripe transfer, once their payout
 * account is ready. Rows are claimed first so two runs can't pay the same money twice.
 */
export async function payReferralEarnings(admin: SupabaseClient, referrerId: string): Promise<number> {
  const { data: who } = await admin.from('creators').select('stripe_account_id, payouts_enabled').eq('id', referrerId).single();
  if (!who?.stripe_account_id || !who.payouts_enabled) return 0;
  await blockSelfInvites(admin, referrerId, who.stripe_account_id as string);
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
