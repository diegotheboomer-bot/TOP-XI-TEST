// PayPal Payouts (pays clippers to PayPal or Venmo). Needs a PayPal Business
// account approved for Payouts, and a REST app's client ID and secret.
// Docs: developer.paypal.com/docs/payouts/standard/
import { requireEnv } from './env';

const base = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

export const paypalConfigured = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const auth = Buffer.from(`${requireEnv('PAYPAL_CLIENT_ID')}:${requireEnv('PAYPAL_CLIENT_SECRET')}`).toString('base64');
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal sign-in failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/**
 * Sends one payout. `senderItemId` must be unique per payout: it is the
 * idempotency key (PayPal keeps it 30 days) and comes back in webhooks.
 * Returns the PayPal batch id.
 */
export async function sendPayPalPayout(p: { senderItemId: string; amount: number; wallet: 'PAYPAL' | 'VENMO'; receiver: string; note: string }): Promise<string> {
  const res = await fetch(`${base()}/v1/payments/payouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': p.senderItemId },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: `batch_${p.senderItemId}`, email_subject: 'You got paid for your clip', email_message: p.note },
      items: [
        {
          // Venmo: US mobile number. PayPal: account email.
          recipient_type: p.wallet === 'VENMO' ? 'PHONE' : 'EMAIL',
          recipient_wallet: p.wallet,
          receiver: p.receiver,
          amount: { value: p.amount.toFixed(2), currency: 'USD' },
          note: p.note,
          sender_item_id: p.senderItemId,
        },
      ],
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { batch_header?: { payout_batch_id: string }; message?: string; name?: string };
  if (!res.ok || !json.batch_header) throw new Error(json.message ?? json.name ?? `PayPal payout failed (${res.status})`);
  return json.batch_header.payout_batch_id;
}

/** Checks a webhook really came from PayPal (PayPal's verify-webhook-signature API). */
export async function verifyPayPalWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const res = await fetch(`${base()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: requireEnv('PAYPAL_WEBHOOK_ID'),
      webhook_event: event,
    }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { verification_status?: string };
  return json.verification_status === 'SUCCESS';
}
