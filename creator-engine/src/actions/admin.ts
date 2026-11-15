'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from './support';
import type { ActionState } from './result';
import { hasTestData, removeTestData as removeAll, seedTestData } from '@/lib/test-seed';
import { MONEY_TEST_PREFIX, isMoneyTest } from '@/lib/test-data';
import { generateDiscountCode, refParam } from '@/lib/attribution';
import { selectAll } from '@/lib/fetch-all';

/** Atlas team only: give or remove the verified badge on a clipper or a business. */
export async function setVerified(kind: 'creator' | 'brand', id: string, verified: boolean): Promise<ActionState> {
  if (!(await isSupportAdmin())) return { error: 'Not allowed.' };
  const { error } = await createAdminClient().from(kind === 'creator' ? 'creators' : 'brands').update({ verified }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/verify');
  return { success: verified ? 'Verified.' : 'Badge removed.' };
}

const localTesting = () => process.env.LOCAL_TEST_ACCOUNTS === '1';

/** Atlas team only: fill the site with fake test data (all @atlas.test, never synced or paid). */
export async function loadTestData(): Promise<ActionState> {
  if (!localTesting() && !(await isSupportAdmin())) return { error: 'Not allowed.' };
  const db = createAdminClient();
  if (await hasTestData(db)) return { error: 'Test data is already loaded. Remove it first to load it fresh.' };
  try {
    const summary = await seedTestData(db);
    revalidatePath('/admin/test-data');
    return { success: `Loaded: ${summary}.` };
  } catch (e) {
    return { error: `Stopped part way: ${e instanceof Error ? e.message : 'unknown error'}. Tap Remove, then try again.` };
  }
}

/** Atlas team only: delete every @atlas.test account and everything they made. */
export async function removeTestData(): Promise<ActionState> {
  if (!localTesting() && !(await isSupportAdmin())) return { error: 'Not allowed.' };
  try {
    const summary = await removeAll(createAdminClient());
    revalidatePath('/admin/test-data');
    return { success: summary };
  } catch (e) {
    return { error: `Couldn’t finish: ${e instanceof Error ? e.message : 'unknown error'}. Tap Remove again.` };
  }
}

/** Atlas team only: everyone in the Discord right now gets Verified, skipping #verify. */
export async function verifyDiscordMembers(): Promise<ActionState> {
  if (!(await isSupportAdmin())) return { error: 'Not allowed.' };
  const { discordConfigured, verifyCurrentMembers } = await import('@/lib/discord');
  if (!discordConfigured()) return { error: 'Discord isn’t set up.' };
  try {
    const { given, already } = await verifyCurrentMembers();
    return { success: `Done: ${given} members let in, ${already} were already verified.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Discord failed. Try again.' };
  }
}

/**
 * Atlas team only: a real-money test. Gives a clipper an approved balance from a campaign the team
 * funded, so a real cash-out can be tried end to end. The money comes out of that campaign's budget.
 */
export async function creditTestEarning(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isSupportAdmin())) return { error: 'Not allowed.' };
  const campaignId = String(form.get('campaign') ?? '');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const amount = Math.round(Number(form.get('amount')) * 100) / 100;
  if (!campaignId || !email) return { error: 'Pick a campaign and enter the clipper’s email.' };
  if (!(amount >= 0.5)) return { error: 'Enter an amount of at least $0.50.' };
  const admin = createAdminClient();

  const { data: camp } = await admin.from('campaigns').select('id, title, escrow_balance, code_prefix, status').eq('id', campaignId).maybeSingle();
  if (!camp) return { error: 'Campaign not found.' };
  if (camp.status === 'completed') return { error: 'That campaign has ended. Use a running one.' };
  const { data: subs } = await selectAll(() => admin.from('submissions').select('payout_earned, payout_transferred, status').eq('campaign_id', campaignId).order('id'));
  const owed = (subs ?? []).filter((x) => x.status !== 'flagged').reduce((n, x) => n + Number(x.payout_earned) - Number(x.payout_transferred), 0);
  const free = Math.round((Number(camp.escrow_balance) - owed) * 100) / 100;
  if (amount > free) return { error: `That campaign only has $${free.toFixed(2)} free. Add budget first.` };

  // Find the clipper by their sign-in email.
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { error: error.message };
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 1000) break;
  }
  if (!userId) return { error: 'No account with that email.' };
  const { data: creator } = await admin.from('creators').select('id').eq('user_id', userId).maybeSingle();
  if (!creator) return { error: 'That account isn’t a clipper.' };

  // Join the campaign if needed (a clip needs it).
  const { data: joined } = await admin.from('campaign_creators').select('id').eq('campaign_id', campaignId).eq('creator_id', creator.id).maybeSingle();
  if (!joined) {
    const { error } = await admin.from('campaign_creators').insert({ campaign_id: campaignId, creator_id: creator.id, ref_param: refParam(creator.id, campaignId), discount_code: generateDiscountCode(camp.code_prefix as string) });
    if (error) return { error: `Couldn’t add the clipper to the campaign: ${error.message}` };
  }

  const { data: existing } = await admin.from('submissions').select('id, payout_earned, social_platform_video_id').eq('campaign_id', campaignId).eq('creator_id', creator.id).maybeSingle();
  if (existing && !isMoneyTest(existing)) return { error: 'That clipper already has a real clip in this campaign. Use another campaign.' };
  const now = new Date();
  if (existing) {
    const { error } = await admin.from('submissions').update({ payout_earned: Math.round((Number(existing.payout_earned) + amount) * 100) / 100, updated_at: now.toISOString() }).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from('submissions').insert({
      campaign_id: campaignId,
      creator_id: creator.id,
      platform: 'tiktok',
      video_url: 'https://atlasclipping.com/admin/test-data',
      social_platform_video_id: `${MONEY_TEST_PREFIX}${now.getTime()}`,
      status: 'live_tracking',
      payout_earned: amount,
      // Approved long ago, so the hold has passed and it can be cashed out now.
      approved_at: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
      last_synced_at: now.toISOString(),
    });
    if (error) return { error: error.message };
  }
  revalidatePath('/clipper', 'layout');
  return { success: `$${amount.toFixed(2)} added to ${email}’s balance from “${camp.title}”. Sign in as them and cash out.` };
}
