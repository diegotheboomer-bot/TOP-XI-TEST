import { TIERS, TIER_LABEL, TIER_PERKS, TIER_RULES, TRUSTED_FROM, holdLabel, tierRank } from '@/lib/tiers';
import { compact } from '@/lib/format';
import { TierBadge } from './tier-badge';

/** Front page: the five clipper ranks, what it takes to reach each and what it unlocks. */
export function LandingRanks() {
  return (
    <section className="border-t border-zinc-200/80 py-20">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Clipper ranks</p>
      <h2 className="balance mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Clip more, get paid faster</h2>
      <p className="mt-2 max-w-xl text-zinc-500">Everyone starts at Silver. Real views and approved clips move you up, and every rank pays out sooner.</p>
      <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TIERS.map((t) => {
          const rule = TIER_RULES[t];
          const perks = TIER_PERKS[t];
          return (
            <li key={t} className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
              <TierBadge tier={t} size="lg" className="self-start" />
              <p className="text-sm text-zinc-500">{t === 'silver' ? 'Where everyone starts' : `${compact(rule.views)} views · ${rule.approved} approved clips`}</p>
              <ul className="mt-auto space-y-1.5 text-sm">
                <li>Paid {holdLabel(perks.holdHours)} after approval</li>
                <li>{perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`}</li>
                {tierRank(t) >= tierRank(TRUSTED_FROM) && <li className="font-medium text-[rgb(var(--brand-ta))]">Trusted badge</li>}
              </ul>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-zinc-500">{TIER_LABEL.majesty} also needs no fraud flags in the last 90 days.</p>
    </section>
  );
}
