export const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);

/** Always two decimals, e.g. $2,665.65 or $1,200.00. */
export const usdCents = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

/** A short, unique reference for a clip, for support and disputes: CLP- and the first 8 characters of its id. */
export const clipRef = (id: string) => `CLP-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

export const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const percent = (n: number) => `${(n * 100).toFixed(n < 0.01 ? 2 : 1)}%`;

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export const payoutModelLabel = { hybrid: 'Fee + views', pure_cpm: 'Pay per view', cps_performance: 'Merch commission', per_post: 'Per post', pool: 'Pool' } as const;

export function termsLabel(c: { payout_model: keyof typeof payoutModelLabel; base_payout: number; cpm_rate: number; cpm_cap: number; cps_commission_pct: number }): string {
  const cap = `up to ${usd(c.cpm_cap)}`;
  if (c.payout_model === 'hybrid') return `${usd(c.base_payout)} + ${usd(c.cpm_rate)} CPM · ${cap}`;
  if (c.payout_model === 'pure_cpm') return `${usd(c.cpm_rate)} CPM · ${cap}`;
  if (c.payout_model === 'per_post') return `${usd(c.base_payout)} per approved clip`;
  if (c.payout_model === 'pool') return 'Budget split by views';
  return `${c.cps_commission_pct}% per sale · ${cap}`;
}

/** $31K, $4.2K, $950 */
export const usdCompact = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: n >= 1000 ? 1 : 0 }).format(n);

/** Per-platform rates that differ from the base rate, in the campaign's platform order. */
export function platformRates(c: { cpm_rate: number; platform_rates?: Partial<Record<string, number>> | null; platforms?: string[] }): { platform: string; rate: number }[] {
  const rates = c.platform_rates ?? {};
  const list = (c.platforms ?? Object.keys(rates)).map((p) => ({ platform: p, rate: Number(rates[p] ?? c.cpm_rate) }));
  return list.some((r) => r.rate !== Number(c.cpm_rate)) || list.some((r, _, a) => r.rate !== a[0].rate) ? list : [];
}

/** Headline rate and the smaller terms line for a campaign card. */
export function rateParts(c: {
  payout_model: keyof typeof payoutModelLabel;
  base_payout: number;
  cpm_rate: number;
  cpm_cap: number;
  cps_commission_pct: number;
  platform_rates?: Partial<Record<string, number>> | null;
  platforms?: string[];
}): { rate: string; unit: string; terms: string } {
  const cap = `up to ${usd(c.cpm_cap)}`;
  if (c.payout_model === 'cps_performance') return { rate: `${c.cps_commission_pct}%`, unit: 'of each sale', terms: cap };
  if (c.payout_model === 'per_post') return { rate: usd(c.base_payout), unit: 'per clip', terms: 'flat, once approved' };
  if (c.payout_model === 'pool') return { rate: 'Pool', unit: 'split by views', terms: 'paid when it ends' };
  const split = platformRates(c);
  // Lowest platform rate when they differ; the campaign page lists each one.
  const rate = split.length ? usdCents(Math.min(...split.map((r) => r.rate))) : usdCents(c.cpm_rate);
  return { rate, unit: 'per 1K views', terms: c.payout_model === 'hybrid' ? `${usd(c.base_payout)} base · ${cap}` : cap };
}

export function hoursLabel(ms: number): string {
  const h = Math.ceil(ms / 3_600_000);
  return h >= 48 ? `${Math.round(h / 24)}d` : `${Math.max(h, 1)}h`;
}
