import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature') ?? '', requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  const admin = createAdminClient();

  // In-app checkout (src/actions/brand.ts → createDepositIntent).
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { kind, campaign_id: campaignId, budget_cents, fee_cents } = intent.metadata ?? {};
    if (kind === 'campaign_deposit' && campaignId && budget_cents) {
      // Only the budget goes into escrow; the platform fee stays with the platform.
      const budgetCents = Number(budget_cents);
      const feeCents = Number(fee_cents ?? 0);
      // Idempotent: a retried webhook for the same intent is a no-op.
      const { data: recorded, error } = await admin.rpc('record_deposit', {
        p_campaign: campaignId,
        p_amount: budgetCents / 100,
        p_stripe_id: intent.id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (recorded && feeCents > 0) {
        await admin.from('escrow_ledger').insert({ campaign_id: campaignId, entry_type: 'platform_fee', amount: feeCents / 100, stripe_object_id: intent.id });
      }
    }
  }

  // A campaign refund the card issuer couldn't process: Stripe returns the money
  // to the platform balance, so put it back into the campaign's budget.
  if (event.type === 'refund.failed') {
    const refund = event.data.object;
    const campaignId = refund.metadata?.campaign_id;
    if (refund.metadata?.kind === 'campaign_refund' && campaignId) {
      // Deleting the ledger row first makes retries a no-op.
      const { data: removed } = await admin.from('escrow_ledger').delete().eq('stripe_object_id', refund.id).eq('entry_type', 'refund').select('id');
      if (removed?.length) await admin.rpc('escrow_credit', { p_campaign: campaignId, p_amount: refund.amount / 100 });
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object;
    await admin.from('creators').update({ payouts_enabled: account.payouts_enabled ?? false }).eq('stripe_account_id', account.id);
  }

  return NextResponse.json({ received: true });
}
