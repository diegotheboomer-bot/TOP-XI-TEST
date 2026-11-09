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
  })
  .refine((c) => c.cpm_cap >= c.base_payout, { message: 'The cap must be at least the base payout.' });

export const ShopDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/, 'Use your store’s myshopify.com domain');

export const DepositSchema = z.coerce.number().min(50, 'Deposit between $50 and $1,000,000.').max(1_000_000, 'Deposit between $50 and $1,000,000.');
