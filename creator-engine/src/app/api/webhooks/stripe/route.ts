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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const campaignId = session.metadata?.campaign_id;
    if (campaignId && session.payment_status === 'paid' && session.amount_total) {
      // Only the budget goes into escrow; the platform fee line stays with the platform.
      const budgetCents = Number(session.metadata?.budget_cents ?? session.amount_total);
      const feeCents = Number(session.metadata?.fee_cents ?? 0);
      // Idempotent: a retried webhook for the same session is a no-op.
      const { data: recorded, error } = await admin.rpc('record_deposit', {
        p_campaign: campaignId,
        p_amount: budgetCents / 100,
        p_stripe_id: session.id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (recorded && feeCents > 0) {
        await admin.from('escrow_ledger').insert({ campaign_id: campaignId, entry_type: 'platform_fee', amount: feeCents / 100, stripe_object_id: session.id });
      }
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object;
    await admin.from('creators').update({ payouts_enabled: account.payouts_enabled ?? false }).eq('stripe_account_id', account.id);
  }

  return NextResponse.json({ received: true });
}
