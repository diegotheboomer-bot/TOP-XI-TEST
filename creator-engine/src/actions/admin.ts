'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupportAdmin } from './support';
import type { ActionState } from './result';

/** Atlas team only: give or remove the verified badge on a clipper or a business. */
export async function setVerified(kind: 'creator' | 'brand', id: string, verified: boolean): Promise<ActionState> {
  if (!(await isSupportAdmin())) return { error: 'Not allowed.' };
  const { error } = await createAdminClient().from(kind === 'creator' ? 'creators' : 'brands').update({ verified }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/verify');
  return { success: verified ? 'Verified.' : 'Badge removed.' };
}
