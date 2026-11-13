import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Copies a platform profile picture into our 'avatars' bucket and returns its public URL.
 * TikTok and Instagram picture links are signed and expire, so we keep our own copy.
 * Returns null on any problem: a missing picture never blocks connecting.
 */
export async function storeSocialAvatar(admin: SupabaseClient, creatorId: string, platform: string, url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 3 * 1024 * 1024) return null;
    const path = `social/${creatorId}/${platform}-${Date.now()}`;
    const { error } = await admin.storage.from('avatars').upload(path, bytes, { contentType: type, upsert: true });
    if (error) return null;
    return admin.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
