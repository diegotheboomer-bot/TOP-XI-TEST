import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';

export interface Viewer {
  userId: string;
  email: string | null;
  brandId: string | null;
  creatorId: string | null;
}

/** The signed-in user and their brand / creator profile, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const admin = createAdminClient();
  const [brand, creator] = await Promise.all([
    admin.from('brands').select('id').eq('owner_id', data.user.id).maybeSingle(),
    admin.from('creators').select('id').eq('user_id', data.user.id).maybeSingle(),
  ]);
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    brandId: brand.data?.id ?? null,
    creatorId: creator.data?.id ?? null,
  };
}
