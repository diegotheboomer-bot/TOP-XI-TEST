import { describe, expect, it } from 'vitest';
import { HOLD_HOURS, autoPayoutDue, holdHoursLeft, isPayday, streamerCanFlag } from '@/lib/payout-rules';

const now = Date.parse('2026-11-10T12:00:00Z');
const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();

describe('payout rules', () => {
  it('counts the hold down from approval', () => {
    expect(holdHoursLeft(ago(10), now)).toBeCloseTo(HOLD_HOURS - 10);
    expect(holdHoursLeft(ago(HOLD_HOURS + 5), now)).toBe(0);
    expect(holdHoursLeft(null, now)).toBe(0);
  });

  it('lets the streamer flag only during review or the hold', () => {
    expect(streamerCanFlag({ status: 'pending_review', approved_at: null }, now)).toBe(true);
    expect(streamerCanFlag({ status: 'live_tracking', approved_at: ago(24) }, now)).toBe(true);
    expect(streamerCanFlag({ status: 'live_tracking', approved_at: ago(HOLD_HOURS + 1) }, now)).toBe(false);
    expect(streamerCanFlag({ status: 'paid', approved_at: ago(500) }, now)).toBe(false);
  });

  it('pays automatically only after the hold and above the minimum', () => {
    const base = { status: 'live_tracking' as const, campaignEnded: false };
    expect(autoPayoutDue({ ...base, approved_at: ago(24), owed: 50 }, now)).toBe(false); // still holding
    expect(autoPayoutDue({ ...base, approved_at: ago(HOLD_HOURS + 1), owed: 50 }, now)).toBe(true);
    expect(autoPayoutDue({ ...base, approved_at: ago(HOLD_HOURS + 1), owed: 4 }, now)).toBe(false); // under the minimum
    expect(autoPayoutDue({ ...base, approved_at: ago(HOLD_HOURS + 1), owed: 4, campaignEnded: true }, now)).toBe(true);
    expect(autoPayoutDue({ ...base, status: 'flagged' as never, approved_at: ago(500), owed: 50 }, now)).toBe(false);
  });
});

import * as core from '@/lib/demo-core';

describe('automatic payouts (demo)', () => {
  it('pays clips past their hold on the next sync, and leaves clips still holding', () => {
    const s = core.seedDemo(9, '/t/');
    const before = core.campaignDetail(s, 'cmp-ranked')!.submissions;
    const rae = before.find((x) => x.creator_name === '@clipsbyrae')!; // approved long ago, owed
    const frame = before.find((x) => x.creator_name === '@framejump')!; // approved 20h ago
    expect(rae.payout_earned - rae.payout_transferred).toBeGreaterThan(10);
    const result = core.simulateSync(s, 'cmp-ranked');
    expect(result?.success).toContain('paid automatically');
    const after = core.campaignDetail(s, 'cmp-ranked')!.submissions;
    expect(after.find((x) => x.id === rae.id)!.payout_transferred).toBeGreaterThan(rae.payout_transferred);
    expect(after.find((x) => x.id === frame.id)!.payout_transferred).toBe(frame.payout_transferred);
  });

  it('lets the streamer flag a clip during the hold but not after it', () => {
    const s = core.seedDemo(9, '/t/');
    const subs = core.campaignDetail(s, 'cmp-ranked')!.submissions;
    const holding = subs.find((x) => x.creator_name === '@framejump')!;
    const locked = subs.find((x) => x.creator_name === '@clipsbyrae')!;
    expect(core.reviewSubmission(s, locked.id, 'flag')?.error).toContain('locked');
    expect(core.reviewSubmission(s, holding.id, 'flag')?.success).toBe('Flagged.');
  });
});

describe('payday', () => {
  it('is Friday (UTC) only', () => {
    expect(isPayday(Date.parse('2026-11-13T12:00:00Z'))).toBe(true);
    expect(isPayday(Date.parse('2026-11-10T12:00:00Z'))).toBe(false);
  });
});
