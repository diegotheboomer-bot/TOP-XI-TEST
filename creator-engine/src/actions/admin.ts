'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from './support';
import type { ActionState } from './result';
import { hasTestData, removeTestData as removeAll, seedTestData } from '@/lib/test-seed';

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
