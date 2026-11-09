import { describe, expect, it } from 'vitest';
import { PayoutHandleSchema, normalizeUsPhone, payoutDestination, payoutReady } from '@/lib/payout-methods';

describe('payout methods', () => {
  it('normalises US mobile numbers and rejects others', () => {
    expect(normalizeUsPhone('(201) 555-0123')).toBe('+12015550123');
    expect(normalizeUsPhone('+1 201 555 0123')).toBe('+12015550123');
    expect(normalizeUsPhone('12015550123')).toBe('+12015550123');
    expect(normalizeUsPhone('+44 7700 900123')).toBeNull();
    expect(normalizeUsPhone('055 010 0123')).toBeNull();
    expect(normalizeUsPhone('123')).toBeNull();
  });

  it('validates PayPal emails and Venmo numbers', () => {
    expect(PayoutHandleSchema.safeParse({ method: 'paypal', handle: ' Rae@Example.com ' }).data).toEqual({ method: 'paypal', handle: 'rae@example.com' });
    expect(PayoutHandleSchema.safeParse({ method: 'paypal', handle: 'not-an-email' }).success).toBe(false);
    expect(PayoutHandleSchema.safeParse({ method: 'venmo', handle: '201-555-0123' }).data).toEqual({ method: 'venmo', handle: '+12015550123' });
    expect(PayoutHandleSchema.safeParse({ method: 'venmo', handle: '12' }).success).toBe(false);
  });

  it('is ready only when the chosen method is complete', () => {
    expect(payoutReady({ method: 'stripe', handle: null, stripeReady: false, lastFailure: null })).toBe(false);
    expect(payoutReady({ method: 'stripe', handle: null, stripeReady: true, lastFailure: null })).toBe(true);
    expect(payoutReady({ method: 'paypal', handle: 'a@b.co', stripeReady: false, lastFailure: null })).toBe(true);
    expect(payoutDestination({ method: 'venmo', handle: '+12015550123' })).toBe('Venmo · +1 201 555 0123');
  });
});

import * as core from '@/lib/demo-core';

describe('paying clippers by their chosen method (demo)', () => {
  it('pays a PayPal clipper in full and says where it went', () => {
    const s = core.seedDemo(9, '/t/');
    const row = core.campaignDetail(s, 'cmp-ranked')!.submissions.find((x) => x.creator_name === '@framejump')!;
    expect(core.setPayoutMethod(s, row.creator_id, 'paypal', 'framejump@example.com')?.success).toContain('PayPal · framejump@example.com');
    const owed = row.payout_earned - row.payout_transferred;
    const result = core.releasePayout(s, row.id);
    expect(result?.success).toContain('via PayPal');
    const after = core.campaignDetail(s, 'cmp-ranked')!.submissions.find((x) => x.id === row.id)!;
    expect(after.payout_transferred - row.payout_transferred).toBeCloseTo(owed, 2);
  });

  it('refuses PayPal or Venmo without details, and a clipper with nothing set up', () => {
    const s = core.seedDemo(9, '/t/');
    const id = core.demoCreators(s).find((c) => c.name === 'Shortsmith')!.id;
    expect(core.setPayoutMethod(s, id, 'venmo', null)?.error).toBeTruthy();
    expect(core.creatorDashboard(s, id).payoutsEnabled).toBe(false);
  });
});
