import { describe, expect, it } from 'vitest';
import * as core from '@/lib/demo-core';


describe('demo store', () => {
  it('auto-approves a clean pending video once its review window passes, but not one missing #ad', () => {
    const s = core.seedDemo(9, '/t/');
    const pending = () => core.campaignDetail(s, 'cmp-ranked')!.submissions.filter((x) => x.status === 'pending_review').map((x) => x.creator_name);
    expect(pending()).toEqual(['@cutroom', '@dailyclips.hq']);
    // @cutroom was submitted 30h ago with a 48h window: 4 syncs = 16h is not enough, 5 = 20h is.
    for (let i = 0; i < 4; i++) core.simulateSync(s, 'cmp-ranked');
    expect(pending()).toContain('@cutroom');
    const result = core.simulateSync(s, 'cmp-ranked');
    expect(result?.success).toContain('1 auto-approved');
    expect(pending()).toEqual(['@dailyclips.hq']);
  });

  it('keeps escrow, payouts and fees consistent through a payout', () => {
    const s = core.seedDemo(9, '/t/');
    const before = core.campaignDetail(s, 'cmp-ranked')!;
    const row = before.submissions.find((x) => x.creator_name === '@framejump')!;
    const owed = row.payout_earned - row.payout_transferred;
    expect(core.releasePayout(s, row.id)?.success).toContain('Paid');
    const after = core.campaignDetail(s, 'cmp-ranked')!;
    expect(after.campaign.escrow_balance).toBeCloseTo(before.campaign.escrow_balance - owed, 2);
    // Clippers are paid in full; fees only come from deposits.
    expect(after.paidOut).toBeCloseTo(before.paidOut + owed, 2);
    expect(after.fees).toBeCloseTo(before.fees, 2);
  });

  it('charges the streamer 9% on top and puts the full budget in escrow', () => {
    const s = core.seedDemo(9, '/t/');
    const before = core.campaignDetail(s, 'cmp-ranked')!;
    expect(core.fundEscrow(s, 'cmp-ranked', 1000)?.success).toContain('$1,090.00');
    const after = core.campaignDetail(s, 'cmp-ranked')!;
    expect(after.campaign.escrow_balance - before.campaign.escrow_balance).toBeCloseTo(1000, 2);
    expect(after.fees - before.fees).toBeCloseTo(90, 2);
  });

  it('blocks payouts to creators without payout setup', () => {
    const s = core.seedDemo(9, '/t/');
    const row = core.campaignDetail(s, 'cmp-merch')!.submissions.find((x) => x.creator_name === '@kayclips')!;
    expect(core.releasePayout(s, row.id)?.error).toContain('payout setup');
  });

  it('limits moment claims and requires joining first', () => {
    const s = core.seedDemo(9, '/t/');
    const moment = s.moments.find((m) => m.title.startsWith('Chat roasts'))!;
    expect(core.claimMoment(s, 'cr-shortsmith', moment.id)?.error).toContain('Join');
    expect(core.claimMoment(s, 'cr-clipsbyrae', moment.id)?.success).toContain('Claimed');
    expect(core.claimMoment(s, 'cr-clipsbyrae', moment.id)?.error).toContain('already');
    const full = s.moments.find((m) => m.claimed_by.length >= m.max_claims)!;
    expect(core.claimMoment(s, 'cr-vodvault', full.id)?.error).toBeTruthy();
  });

  it('accepts Shorts from a verified channel, and rejects platforms a campaign does not allow', () => {
    const s = core.seedDemo(9, '/t/');
    // shortsmith has no TikTok connected: Shorts still works, TikTok doesn't.
    core.joinCampaign(s, 'cr-shortsmith', 'cmp-charity');
    expect(core.submitVideo(s, 'cr-shortsmith', 'cmp-charity', 'https://www.instagram.com/reel/Cabc12345/')?.error).toContain('doesn’t accept');
    expect(core.submitVideo(s, 'cr-shortsmith', 'cmp-charity', 'https://www.tiktok.com/@s/video/7399999999999999999')?.error).toContain('Connect your TikTok');
    expect(core.submitVideo(s, 'cr-shortsmith', 'cmp-charity', 'https://youtube.com/shorts/dQw4w9WgXcQ')?.success).toContain('verified channel');
  });
});
