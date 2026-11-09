import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPayPalWebhook } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

/** Payout item outcomes where the money did not reach the clipper and is back with the platform. */
const UNDONE: Record<string, string> = {
  'PAYMENT.PAYOUTS-ITEM.FAILED': 'PayPal couldn’t send your last payout.',
  'PAYMENT.PAYOUTS-ITEM.RETURNED': 'Your last payout was returned. It wasn’t claimed within 30 days, or the account couldn’t receive it.',
  'PAYMENT.PAYOUTS-ITEM.BLOCKED': 'PayPal blocked your last payout.',
  'PAYMENT.PAYOUTS-ITEM.REFUNDED': 'Your last payout was refunded by PayPal.',
  'PAYMENT.PAYOUTS-ITEM.CANCELED': 'Your last payout was cancelled.',
};

interface PayoutItemEvent {
  event_type: string;
  resource?: { payout_item?: { sender_item_id?: string } };
}

/**
 * PayPal Payouts webhook. When a payout to PayPal/Venmo doesn't go through, put
 * the money back: remove the ledger row, credit the campaign's escrow, lower
 * the clip's paid amount so the streamer can pay again, and tell the clipper
 * to check their details.
 */
export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as PayoutItemEvent | null;
  if (!event || !(await verifyPayPalWebhook(req.headers, event))) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

  const reason = UNDONE[event.event_type];
  const senderItemId = event.resource?.payout_item?.sender_item_id;
  if (!reason || !senderItemId) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  // Deleting the ledger row first makes retried webhooks a no-op.
  const { data: rows } = await admin
    .from('escrow_ledger')
    .delete()
    .eq('stripe_object_id', `paypal:${senderItemId}`)
    .eq('entry_type', 'creator_payout')
    .select('campaign_id, submission_id, amount');
  const row = rows?.[0];
  if (!row) return NextResponse.json({ received: true });

  const amount = Number(row.amount);
  await admin.rpc('escrow_credit', { p_campaign: row.campaign_id, p_amount: amount });
  const { data: sub } = await admin.from('submissions').select('payout_transferred, status, creator_id').eq('id', row.submission_id).single();
  if (sub) {
    await admin
      .from('submissions')
      .update({ payout_transferred: Math.max(0, Math.round((Number(sub.payout_transferred) - amount) * 100) / 100), ...(sub.status === 'paid' ? { status: 'live_tracking' } : {}) })
      .eq('id', row.submission_id);
    await admin.from('payout_methods').update({ last_failure: `${reason} Check your details and save them again.` }).eq('creator_id', sub.creator_id);
  }
  return NextResponse.json({ received: true });
}
