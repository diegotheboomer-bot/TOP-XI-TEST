import Link from 'next/link';
import { ArrowRight, Gift } from 'lucide-react';
import type { ReferralSummary } from '@/lib/data';
import { REFERRAL_DAYS } from '@/lib/referrals';
import { TIER_PERKS } from '@/lib/tiers';
import { usdCents } from '@/lib/format';

/** Earnings teaser for Invite & earn: one tappable strip with the pitch and your total. */
export function ReferralPanel({ r }: { r: ReferralSummary }) {
  return (
    <Link
      href="/clipper/invite"
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-brand-a/30 bg-white p-4 shadow-card transition hover:border-brand-a/60 sm:p-5"
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2/3" style={{ background: 'radial-gradient(60% 120% at 0% 50%, rgb(var(--brand-a) / 0.16), transparent 75%)' }} />
      <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink shadow-[0_10px_24px_-10px_rgb(var(--brand-b)/0.9)]">
        <Gift className="size-5" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-semibold tracking-tight">Earn from every friend you invite</span>
        <span className="block text-sm text-zinc-500">
          Their {TIER_PERKS.silver.feePct}% fee is yours for {REFERRAL_DAYS} days.{' '}
          {r.invited > 0 ? `${r.active} earning for you · ${usdCents(r.earned)} so far` : 'No limit.'}
        </span>
      </span>
      <ArrowRight className="relative size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900" />
    </Link>
  );
}
