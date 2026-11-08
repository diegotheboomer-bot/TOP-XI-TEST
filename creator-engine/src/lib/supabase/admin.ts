import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '../env';

/** Service-role client. Server only — bypasses RLS. Callers must authorise first. */
export function createAdminClient() {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
