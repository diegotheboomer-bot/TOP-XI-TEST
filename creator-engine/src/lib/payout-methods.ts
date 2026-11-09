// Where a clipper gets paid: a bank account or debit card through Stripe
// Connect, or PayPal / Venmo through PayPal Payouts.
import { z } from 'zod';

export type PayoutMethod = 'stripe' | 'paypal' | 'venmo';
export const PAYOUT_METHODS: PayoutMethod[] = ['stripe', 'paypal', 'venmo'];

export const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = { stripe: 'Bank or debit card', paypal: 'PayPal', venmo: 'Venmo' };

export interface PayoutSetup {
  method: PayoutMethod;
  /** PayPal email or Venmo mobile number (+1…); null for Stripe. */
  handle: string | null;
  /** Stripe Connect onboarding finished and payouts enabled. */
  stripeReady: boolean;
  /** Why the last PayPal/Venmo payout came back, until the clipper saves new details. */
  lastFailure: string | null;
}

export const payoutReady = (p: PayoutSetup) => (p.method === 'stripe' ? p.stripeReady : !!p.handle);

/** "PayPal · rae@example.com", "Venmo · +1 201 555 0123", "Bank or debit card". */
export function payoutDestination(p: Pick<PayoutSetup, 'method' | 'handle'>): string {
  if (p.method === 'stripe' || !p.handle) return PAYOUT_METHOD_LABEL[p.method];
  const handle = p.method === 'venmo' ? formatUsPhone(p.handle) : p.handle;
  return `${PAYOUT_METHOD_LABEL[p.method]} · ${handle}`;
}

/** US mobile numbers only (Venmo is US-only): returns +1XXXXXXXXXX or null. */
export function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  // NANP: area code and exchange can't start with 0 or 1.
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(local) ? `+1${local}` : null;
}

export function formatUsPhone(e164: string): string {
  const d = e164.replace(/^\+1/, '');
  return d.length === 10 ? `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : e164;
}

/** Validates the form for a PayPal or Venmo destination. */
export const PayoutHandleSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('paypal'), handle: z.string().trim().toLowerCase().pipe(z.email('Enter the email address on your PayPal account.')) }),
  z.object({
    method: z.literal('venmo'),
    handle: z.string().transform((v, ctx) => {
      const phone = normalizeUsPhone(v);
      if (!phone) ctx.addIssue({ code: 'custom', message: 'Enter the US mobile number on your Venmo account.' });
      return phone ?? '';
    }),
  }),
]);
