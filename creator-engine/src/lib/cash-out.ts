import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from './fetch-all';
import { payClip } from './pay-clip';
import { MIN_CASHOUT, cashoutReady } from './payout-rules';
import { stripePayoutCost } from './payout-costs';
import { paidThisMonth, stripeOwnsPricing } from './stripe';
import { TIER_PERKS, type Tier } from './tiers';

export type CashOutResult = { sent: number; gross: number; fee: number; stripeCost: number; errors: string[] };

/** Whether a payout goes through Stripe, and if so whether it's the first this month. */
export async function stripeCostFor(admin: SupabaseClient, creatorId: string): Promise<{ viaStripe: boolean; firstThisMonth: boolean }> {
  const [{ data: c }, { data: m }] = await Promise.all([
    admin.from('creators').select('stripe_account_id').eq('id', creatorId).single(),
    admin.from('payout_methods').select('method').eq('creator_id', creatorId).maybeSingle(),
  ]);
  const viaStripe = (m?.method ?? 'stripe') === 'stripe' && !!c?.stripe_account_id;
  if (!viaStripe) return { viaStripe, firstThisMonth: false };
  // Stripe-owned pricing: Stripe charges Atlas no payout fees for this account, so none are passed on.
  if (await stripeOwnsPricing(c!.stripe_account_id as string).catch(() => false)) return { viaStripe: false, firstThisMonth: false };
  // If Stripe can't be asked, assume the monthly fee is due rather than leave Atlas paying it.
  const paid = await paidThisMonth(c!.stripe_account_id as string).catch(() => false);
  return { viaStripe, firstThisMonth: !paid };
}

/**
 * Sends a clipper's ready money (all of it, or `amount`). One cash-out = one Stripe payout,
 * so Stripe's payout charge comes off once, from the first clip big enough to carry it.
 * `endedOnly` limits it to money from ended campaigns (the automatic payouts).
 */
export async function sendCashOut(
  admin: SupabaseClient,
  creatorId: string,
  tier: Tier,
  opts: { amount?: number; endedOnly?: boolean } = {},
): Promise<CashOutResult | { error: string }> {
  const perks = TIER_PERKS[tier];
  const { data: subs } = await selectAll(() =>
    admin.from('submissions').select('id, status, approved_at, payout_earned, payout_transferred, campaigns(payout_model, status)').eq('creator_id', creatorId).order('id'),
  );
  const ready = (subs ?? [])
    .map((s) => ({ ...s, owed: Math.round((Number(s.payout_earned) - Number(s.payout_transferred)) * 100) / 100 }))
    .filter((s) => {
      const c = s.campaigns as unknown as { payout_model: string; status: string } | null;
      if (opts.endedOnly && c?.status !== 'completed') return false;
      const openPool = c?.payout_model === 'pool' && c.status !== 'completed';
      return s.owed > 0 && !openPool && cashoutReady(s as { status: 'live_tracking'; approved_at: string | null }, Date.now(), perks.holdHours);
    })
    .sort((a, b) => b.owed - a.owed);
  if (!ready.length) return { error: 'Nothing is ready to cash out yet.' };
  const balance = Math.round(ready.reduce((n, s) => n + s.owed, 0) * 100) / 100;
  let remaining = opts.amount == null ? balance : Math.min(balance, Math.floor(Number(opts.amount) * 100) / 100);
  if (!(remaining >= 0.01)) return { error: 'Enter an amount to cash out.' };
  if (remaining < MIN_CASHOUT) return { error: `The smallest cash-out is $${MIN_CASHOUT}. You have $${balance.toFixed(2)} ready.` };

  const { viaStripe, firstThisMonth } = await stripeCostFor(admin, creatorId);
  const charged = viaStripe ? stripePayoutCost(remaining, firstThisMonth) : 0;
  let cost = charged;
  let sent = 0;
  let gross = 0;
  const errors: string[] = [];
  for (const s of ready) {
    if (remaining < 0.01) break;
    const take = Math.min(s.owed, remaining);
    // Stripe's charge rides on the first clip that can carry it on top of the 5% fee.
    const carry = cost > 0 && take * (1 - perks.feePct / 100) > cost + 0.01 ? cost : 0;
    const r = await payClip(admin, s.id, 0.01, take, carry);
    if (r.ok) {
      sent += r.gross;
      gross += take;
      if (carry) cost = 0;
      remaining = Math.round((remaining - take) * 100) / 100;
    } else errors.push(r.error);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const stripeCost = round(charged - cost); // what was actually taken
  return { sent: round(sent), gross: round(gross), fee: round(gross - sent - stripeCost), stripeCost, errors };
}
