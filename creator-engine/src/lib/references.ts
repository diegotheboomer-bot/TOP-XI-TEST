// Reference material a streamer attaches to a campaign: links, and uploaded images, videos or files.
import { z } from 'zod';

export type RefKind = 'link' | 'image' | 'video' | 'file';
export interface Reference {
  kind: RefKind;
  url: string;
  name: string;
}

export const REF_MAX = 12;
export const REF_MAX_BYTES = 50 * 1024 * 1024;

export const ReferenceSchema = z.object({
  kind: z.enum(['link', 'image', 'video', 'file']),
  url: z.string().url().max(2000),
  name: z.string().trim().min(1).max(120),
});

/** What kind of file a MIME type is. */
export function kindOf(type: string): RefKind {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return 'file';
}

/** A readable name for a link: its host and path, without the scheme. */
export function linkName(url: string): string {
  try {
    const u = new URL(url);
    return (u.host.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}
