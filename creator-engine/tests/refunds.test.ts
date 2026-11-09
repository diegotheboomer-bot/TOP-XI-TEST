import { describe, expect, it } from 'vitest';
import * as core from '@/lib/demo-core';
import { planRefunds } from '@/lib/refunds';

describe('planRefunds', () => {
  it('takes from the newest deposit first and never more than each has left', () => {
    const deposits = [
      { id: 'pi_new', refundableCents: 50_000 },
      { id: 'pi_mid', refundableCents: 0 },
      { id: 'pi_old', refundableCents: 100_000 },
    ];
    expect(planRefunds(deposits, 70_000)).toEqual([
      { id: 'pi_new', cents: 50_000 },
      { id: 'pi_old', cents: 20_000 },
    ]);
  });

  it('returns less than asked when the deposits cannot cover it', () => {
    const plan = planRefunds([{ id: 'pi_a', refundableCents: 1_000 }], 5_000);
    expect(plan).toEqual([{ id: 'pi_a', cents: 1_000 }]);
  });

  it('plans nothing for a zero refund', () => {
    expect(planRefunds([{ id: 'pi_a', refundableCents: 1_000 }], 0)).toEqual([]);
  });
});

describe('cancelling a campaign (demo)', () => {
  it('refunds the unspent budget, keeps what clippers earned, and keeps the fee', () => {
    const s = core.seedDemo(9, '/t/');
    const before = core.campaignDetail(s, 'cmp-ranked')!;
    const unspent = before.budget.available;
    const reserved = before.campaign.escrow_balance - unspent;
    expect(unspent).toBeGreaterThan(0);

    expect(core.cancelCampaign(s, 'cmp-ranked')?.success).toContain('refunded');
    const after = core.campaignDetail(s, 'cmp-ranked')!;
    expect(after.campaign.status).toBe('completed');
    expect(after.refunded).toBeCloseTo(unspent, 2);
    expect(after.campaign.escrow_balance).toBeCloseTo(reserved, 2);
    expect(after.fees).toBeCloseTo(before.fees, 2);
    expect(after.budget.available).toBe(0);

    // Earned money can still be paid out after cancelling.
    const owed = after.submissions.find((x) => x.status === 'live_tracking' && x.payout_earned - x.payout_transferred >= 1)!;
    expect(core.releasePayout(s, owed.id)?.success).toContain('Paid');
  });

  it('freezes the campaign: no syncs, approvals, new budget or moments', () => {
    const s = core.seedDemo(9, '/t/');
    core.cancelCampaign(s, 'cmp-ranked');
    const pending = core.campaignDetail(s, 'cmp-ranked')!.submissions.find((x) => x.status === 'pending_review')!;
    expect(core.simulateSync(s, 'cmp-ranked')?.error).toBeTruthy();
    expect(core.reviewSubmission(s, pending.id, 'approve')?.error).toBeTruthy();
    expect(core.fundEscrow(s, 'cmp-ranked', 500)?.error).toBeTruthy();
    expect(core.setCampaignStatus(s, 'cmp-ranked', 'active')?.error).toBeTruthy();
    expect(core.addMoment(s, 'cmp-ranked', { title: 'x', timestamp_label: '1:00:00', max_claims: 3 } as never)?.error).toBeTruthy();
  });

  it('refunds budget freed up later, e.g. by flagging a clip', () => {
    const s = core.seedDemo(9, '/t/');
    core.cancelCampaign(s, 'cmp-ranked');
    const owed = core.campaignDetail(s, 'cmp-ranked')!.submissions.find((x) => x.status === 'live_tracking' && x.payout_earned - x.payout_transferred >= 1)!;
    core.reviewSubmission(s, owed.id, 'flag');
    const freed = core.campaignDetail(s, 'cmp-ranked')!.budget.available;
    expect(freed).toBeGreaterThan(0);
    expect(core.cancelCampaign(s, 'cmp-ranked')?.success).toContain('refunded');
    expect(core.campaignDetail(s, 'cmp-ranked')!.budget.available).toBe(0);
  });
});
