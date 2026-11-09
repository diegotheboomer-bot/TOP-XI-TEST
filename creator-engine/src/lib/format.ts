export const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);

/** Always two decimals, e.g. $2,665.65 or $1,200.00. */
export const usdCents = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

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

export const payoutModelLabel = { hybrid: 'Hybrid', pure_cpm: 'Pure CPM', cps_performance: 'Cost per sale' } as const;

export function termsLabel(c: { payout_model: keyof typeof payoutModelLabel; base_payout: number; cpm_rate: number; cpm_cap: number; cps_commission_pct: number }): string {
  const cap = `up to ${usd(c.cpm_cap)}`;
  if (c.payout_model === 'hybrid') return `${usd(c.base_payout)} + ${usd(c.cpm_rate)} CPM · ${cap}`;
  if (c.payout_model === 'pure_cpm') return `${usd(c.cpm_rate)} CPM · ${cap}`;
  return `${c.cps_commission_pct}% per sale · ${cap}`;
}
