import { z } from 'zod';
import { CATEGORY_IDS, CONTENT_TYPE_IDS } from './campaign-tags';
import { REF_MAX, ReferenceSchema } from './references';

// Shared by the server actions and the standalone demo.
const money = (max: number) => z.coerce.number().min(0).max(max).multipleOf(0.01);

export const CampaignSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the campaign a title (3+ characters)').max(255),
    payout_model: z.enum(['hybrid', 'pure_cpm', 'cps_performance', 'per_post', 'pool']),
    base_payout: money(99_999_999),
    cpm_rate: money(9_999),
    cpm_cap: money(99_999_999).refine((n) => n > 0, 'Set a payout cap above $0'),
    cps_commission_pct: z.coerce.number().min(0).max(100),
    code_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/, 'Code prefix: 2–12 letters or digits'),
    asset_folder_url: z.union([z.literal(''), z.string().url()]),
    cover_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a cover colour').default('#18181b'),
    brief: z.string().trim().max(4000, 'Keep the brief under 4,000 characters').default(''),
    // One requirement per line in the form.
    requirements: z
      .string()
      .default('')
      .transform((t) => t.split('\n').map((l) => l.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(120, 'Keep each requirement under 120 characters')).max(12, 'Up to 12 requirements')),
    min_payout: money(99_999).default(0),
    client_name: z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(120).nullable()).default(null),
    min_tier: z.enum(['silver', 'gold', 'platinum', 'diamond', 'majesty']).default('silver'),
    max_clips_per_clipper: z.preprocess((v) => (v === '' || v == null || v === '0' ? null : v), z.coerce.number().int().min(1).max(100).nullable()).default(null),
    moments_enabled: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()).default(false),
    platform_rates: z
      .string()
      .default('{}')
      .transform((t, ctx) => {
        try {
          return JSON.parse(t) as unknown;
        } catch {
          ctx.addIssue({ code: 'custom', message: 'Platform rates could not be read.' });
          return z.NEVER;
        }
      })
      .pipe(z.object({ tiktok: money(9_999).optional(), youtube: money(9_999).optional(), instagram: money(9_999).optional() }).strict()),
    reference_items: z
      .string()
      .default('[]')
      .transform((t, ctx) => {
        try {
          return JSON.parse(t) as unknown;
        } catch {
          ctx.addIssue({ code: 'custom', message: 'References could not be read.' });
          return z.NEVER;
        }
      })
      .pipe(z.array(ReferenceSchema).max(REF_MAX, `Up to ${REF_MAX} references`)),
    platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).min(1, 'Pick at least one platform for clippers').max(3),
    content_types: z.array(z.enum(CONTENT_TYPE_IDS)).min(1, 'Pick at least one kind of video').max(8),
    category: z.enum(CATEGORY_IDS).optional(),
  })
  .refine((c) => c.cpm_cap >= c.base_payout, { message: 'The cap must be at least the base payout.' })
  .refine((c) => c.payout_model !== 'per_post' || c.base_payout > 0, { message: 'Set an amount per clip above $0.' })
  .refine((c) => c.payout_model !== 'pure_cpm' || c.cpm_rate > 0, { message: 'Set a rate per 1,000 views above $0.' })
  .refine((c) => c.min_payout <= c.cpm_cap, { message: 'The minimum payout must be below the maximum.' });

/** What a streamer can change after creating a campaign. Pay terms stay fixed so clippers aren't surprised. */
export const CampaignEditSchema = z.object({
  title: z.string().trim().min(3, 'Give the campaign a title (3+ characters)').max(255),
  category: z.enum(CATEGORY_IDS).optional(),
  brief: z.string().trim().max(4000, 'Keep the brief under 4,000 characters').default(''),
  requirements: z
    .string()
    .default('')
    .transform((t) => t.split('\n').map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(120, 'Keep each requirement under 120 characters')).max(12, 'Up to 12 requirements')),
  asset_folder_url: z.union([z.literal(''), z.string().url()]),
  moments_enabled: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()).default(false),
  min_tier: z.enum(['silver', 'gold', 'platinum', 'diamond', 'majesty']).default('silver'),
  client_name: z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(120).nullable()).default(null),
  max_clips_per_clipper: z.preprocess((v) => (v === '' || v == null || v === '0' ? null : v), z.coerce.number().int().min(1).max(100).nullable()).default(null),
  reference_items: z
    .string()
    .default('[]')
    .transform((t, ctx) => {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'References could not be read.' });
        return z.NEVER;
      }
    })
    .pipe(z.array(ReferenceSchema).max(REF_MAX, `Up to ${REF_MAX} references`)),
});

export const ShopDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/, 'Use your store’s myshopify.com domain');

export const DepositSchema = z.coerce.number().min(50, 'Deposit between $50 and $1,000,000.').max(1_000_000, 'Deposit between $50 and $1,000,000.');

export const THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

/** Returns an error message, or null when the file is an acceptable thumbnail (or empty). */
export function thumbnailError(file: { size: number; type: string } | null | undefined): string | null {
  if (!file || file.size === 0) return null;
  if (!THUMBNAIL_TYPES.includes(file.type)) return 'Thumbnail must be a JPG, PNG or WebP image.';
  if (file.size > THUMBNAIL_MAX_BYTES) return 'Thumbnail must be 2 MB or smaller.';
  return null;
}

export const MomentSchema = z.object({
  title: z.string().trim().min(3, 'Describe the moment in a few words').max(120),
  timestamp_label: z.string().trim().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Use a timestamp like 1:42:07'),
  max_claims: z.coerce.number().int().min(1).max(50).default(3),
});

export type MomentInput = z.infer<typeof MomentSchema>;

/** Form values for a campaign, with the multi-select platforms kept as a list. */
export function campaignInput(form: FormData) {
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));
  return { ...fields, category: fields.category || undefined, platforms: form.getAll('platforms'), content_types: form.getAll('content_types') };
}
