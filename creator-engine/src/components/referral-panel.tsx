import { Gift } from 'lucide-react';
import type { ReferralSummary } from '@/lib/data';
import { REFERRAL_DAYS } from '@/lib/referrals';
import { TIER_PERKS } from '@/lib/tiers';
import { usdCents } from '@/lib/format';
import { CopyField } from './copy-button';

/** Invite link: the 2% cash-out fee of everyone you invite is yours for their first 90 days. */
export function ReferralPanel({ r }: { r: ReferralSummary }) {
  const pending = Math.max(0, r.earned - r.paid);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-brand opacity-[0.08] blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-a/15 text-[rgb(var(--brand-ta))]">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">Invite clippers. Earn without limits.</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Everyone who joins with your link: their {TIER_PERKS.silver.feePct}% cash-out fee goes to you on every cash-out for their first {REFERRAL_DAYS} days. No cap on invites, no cap on earnings.
          </p>
        </div>
      </div>
      <div className="relative mt-4">
        <CopyField label="Your invite link" value={r.link} />
      </div>
      <dl className="relative mt-4 grid grid-cols-3 divide-x divide-zinc-200/80 text-center">
        {[
          ['Invited', String(r.invited)],
          ['Earning now', String(r.active)],
          ['Earned', usdCents(r.earned)],
        ].map(([k, v]) => (
          <div key={k} className="px-2">
            <dd className="text-lg font-semibold tabular-nums tracking-tight">{v}</dd>
            <dt className="text-xs text-zinc-500">{k}</dt>
          </div>
        ))}
      </dl>
      {pending > 0 && <p className="relative mt-3 text-center text-xs text-zinc-500">{usdCents(pending)} is sent to your payout account once it’s set up.</p>}
    </section>
  );
}
