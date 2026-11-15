import { Check } from 'lucide-react';
import { TIERS, TIER_LABEL, TIER_PERKS, TIER_RULES, TRUSTED_FROM, holdLabel, tierRank, type Tier } from '@/lib/tiers';
import { compact } from '@/lib/format';

// Each rank's metal: light face, mid tone, dark edge, and the glow behind it.
const LOOK: Record<Tier, { light: string; mid: string; dark: string; glow: string; text: string }> = {
  silver: { light: '#f4f4f5', mid: '#a1a1aa', dark: '#52525b', glow: 'rgba(212,212,216,0.22)', text: '#d4d4d8' },
  gold: { light: '#fde68a', mid: '#f59e0b', dark: '#92400e', glow: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
  platinum: { light: '#ccfbf1', mid: '#5eead4', dark: '#0f766e', glow: 'rgba(45,212,191,0.22)', text: '#5eead4' },
  diamond: { light: '#cffafe', mid: '#38bdf8', dark: '#1d4ed8', glow: 'rgba(56,189,248,0.28)', text: '#7dd3fc' },
  majesty: { light: '#fef3c7', mid: '#fbbf24', dark: '#a16207', glow: 'rgba(52,211,153,0.28)', text: '#fcd34d' },
};

/** A small metal emblem per rank: shield, star, medal, diamond, crown. */
function Emblem({ tier }: { tier: Tier }) {
  const c = LOOK[tier];
  const id = `rank-${tier}`;
  const fill = `url(#${id})`;
  const shine = `url(#${id}-shine)`;
  const shape: Record<Tier, React.ReactNode> = {
    silver: <path d="M32 5 54 13v17c0 15-9.5 25-22 29C19.5 55 10 45 10 30V13Z" />,
    gold: <path d="M32 5l8.2 16.9 18.6 2.6-13.5 13 3.3 18.5L32 47.2 15.4 56l3.3-18.5-13.5-13 18.6-2.6Z" />,
    platinum: (
      <>
        <path d="M20 4h10l6 16h-10zM44 4H34l-6 16h10z" fill={c.dark} stroke="none" />
        <circle cx="32" cy="40" r="19" />
      </>
    ),
    diamond: <path d="M15 22 23 10h18l8 12-17 32Z" />,
    majesty: <path d="M8 48 11 18l12 13 9-19 9 19 12-13 3 30Z" />,
  };
  const detail: Partial<Record<Tier, React.ReactNode>> = {
    platinum: <circle cx="32" cy="40" r="12" fill="none" stroke={c.dark} strokeOpacity="0.45" strokeWidth="2" />,
    diamond: <path d="M15 22h34M23 10l9 12 9-12M32 22v32" fill="none" stroke={c.dark} strokeOpacity="0.45" strokeWidth="1.5" />,
    majesty: (
      <>
        <rect x="8" y="46" width="48" height="7" rx="2" fill="#34d399" stroke="#047857" strokeWidth="1.5" />
        <circle cx="11" cy="17" r="3" fill={c.light} />
        <circle cx="32" cy="11" r="3" fill={c.light} />
        <circle cx="53" cy="17" r="3" fill={c.light} />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 64 64" className="size-20 drop-shadow-[0_10px_14px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.55" stopColor={c.mid} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill={fill} stroke={c.dark} strokeWidth="1.5" strokeLinejoin="round">
        {shape[tier]}
      </g>
      {/* A soft highlight on the upper half gives the metal its depth. */}
      <g fill={shine} stroke="none">{shape[tier]}</g>
      {detail[tier]}
    </svg>
  );
}

function Line({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 size-4 shrink-0" style={{ color: accent ?? 'rgb(var(--brand-ta))' }} strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

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
          const c = LOOK[t];
          return (
            <li key={t} className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${c.dark}, ${c.mid}, ${c.light})` }} />
              <div className="flex flex-col items-center px-5 pb-4 pt-6 text-center" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${c.glow}, transparent 70%)` }}>
                <Emblem tier={t} />
                <h3 className="mt-3 text-lg font-semibold tracking-tight" style={{ color: c.text }}>
                  {TIER_LABEL[t]}
                </h3>
              </div>
              <div className="flex flex-1 flex-col gap-4 border-t border-zinc-200/80 px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">To reach</p>
                  {t === 'silver' ? (
                    <p className="mt-1.5 text-sm">Sign up. Everyone starts here.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-sm">
                      <li>
                        <b className="tabular-nums">{compact(rule.views)}</b> verified views
                      </li>
                      <li>
                        <b className="tabular-nums">{rule.approved}</b> approved clips
                      </li>
                      <li>
                        <b className="tabular-nums">{Math.round(rule.approvalRate * 100)}%</b> of clips approved
                      </li>
                      {rule.noFraud && <li>No fraud flags in 90 days</li>}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">You get</p>
                  <ul className="mt-1.5 space-y-1">
                    <Line accent={c.text}>Paid {holdLabel(perks.holdHours)} after approval</Line>
                    <Line accent={c.text}>{perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`}</Line>
                    {tierRank(t) >= tierRank(TRUSTED_FROM) && <Line accent={c.text}>Trusted badge for businesses</Line>}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
