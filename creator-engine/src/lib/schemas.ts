import { z } from 'zod';
import { CATEGORY_IDS, CONTENT_TYPE_IDS } from './campaign-tags';

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
    auto_approve_hours: z.coerce.number().int().min(1).max(336).default(48),
    platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).min(1, 'Pick at least one platform for clippers').max(3),
    content_types: z.array(z.enum(CONTENT_TYPE_IDS)).max(8).default([]),
    category: z.enum(CATEGORY_IDS).optional(),
  })
  .refine((c) => c.cpm_cap >= c.base_payout, { message: 'The cap must be at least the base payout.' })
  .refine((c) => c.payout_model !== 'per_post' || c.base_payout > 0, { message: 'Set an amount per clip above $0.' })
  .refine((c) => c.payout_model !== 'pure_cpm' || c.cpm_rate > 0, { message: 'Set a rate per 1,000 views above $0.' });

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
