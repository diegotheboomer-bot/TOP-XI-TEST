import { z } from 'zod';

// Shared by the server actions and the standalone demo.
const money = (max: number) => z.coerce.number().min(0).max(max).multipleOf(0.01);

export const CampaignSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the campaign a title (3+ characters)').max(255),
    payout_model: z.enum(['hybrid', 'pure_cpm', 'cps_performance']),
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
  })
  .refine((c) => c.cpm_cap >= c.base_payout, { message: 'The cap must be at least the base payout.' });

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
