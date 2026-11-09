import { describe, expect, it } from 'vitest';
import * as core from '@/lib/demo-core';

const roster = Array.from({ length: 7 }, (_, i) => ({ handle: `creator${i}`, displayName: `Creator ${i}`, followers: 100_000 * (i + 1) }));

describe('demo store', () => {
  it('auto-approves a clean pending video once its review window passes, but not one missing #ad', () => {
    const s = core.seedDemo(roster, 15);
    const pending = () => core.campaignDetail(s, 'cmp-zero')!.submissions.filter((x) => x.status === 'pending_review').map((x) => x.creator_name);
    expect(pending()).toEqual(['@creator3', '@dailyclips.hq']);
    // creator3 was submitted 30h ago with a 48h window: 4 syncs = 16h is not enough, 5 = 20h is.
    for (let i = 0; i < 4; i++) core.simulateSync(s, 'cmp-zero');
    expect(pending()).toContain('@creator3');
    const result = core.simulateSync(s, 'cmp-zero');
    expect(result?.success).toContain('1 auto-approved');
    expect(pending()).toEqual(['@dailyclips.hq']);
  });

  it('keeps escrow, payouts and fees consistent through a payout', () => {
    const s = core.seedDemo(roster, 15);
    const before = core.campaignDetail(s, 'cmp-zero')!;
    const row = before.submissions.find((x) => x.creator_name === '@creator2')!;
    const owed = row.payout_earned - row.payout_transferred;
    expect(core.releasePayout(s, row.id)?.success).toContain('Paid');
    const after = core.campaignDetail(s, 'cmp-zero')!;
    expect(after.campaign.escrow_balance).toBeCloseTo(before.campaign.escrow_balance - owed, 2);
    expect(after.paidOut + after.fees).toBeCloseTo(before.paidOut + before.fees + owed, 2);
  });

  it('blocks payouts to creators without payout setup', () => {
    const s = core.seedDemo(roster, 15);
    const row = core.campaignDetail(s, 'cmp-snack')!.submissions.find((x) => x.creator_name === '@creator5')!;
    expect(core.releasePayout(s, row.id)?.error).toContain('payout setup');
  });
});
