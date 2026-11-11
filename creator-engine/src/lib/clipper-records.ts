import type { SupabaseClient } from '@supabase/supabase-js';
import { recordFrom, tierFor, type ClipperRecord, type Tier } from './tiers';
import { selectAllIn } from './fetch-all';

/** Track records (for tiers) of the given clippers, from all their clips. */
export async function clipperRecords(admin: SupabaseClient, ids: string[]): Promise<Map<string, ClipperRecord>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, ClipperRecord>();
  if (!unique.length) return out;
  const { data } = await selectAllIn(unique, (ids) => admin.from('submissions').select('creator_id, status, current_view_count, fraud_score, created_at').in('creator_id', ids).order('id'));
  for (const id of unique) out.set(id, recordFrom((data ?? []).filter((s) => s.creator_id === id) as { status: string; current_view_count: number; fraud_score: number; created_at: string }[]));
  return out;
}

export async function clipperTier(admin: SupabaseClient, id: string): Promise<Tier> {
  return tierFor((await clipperRecords(admin, [id])).get(id)!);
}
