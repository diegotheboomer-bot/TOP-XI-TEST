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

/** Star facets: each spike split into a lit half and a shaded half, which reads as a bevelled 3D star. */
function starFacets(cx: number, cy: number, outer: number, inner: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
  return pts.map((p, i) => {
    const q = pts[(i + 1) % 10];
    return { d: `M${cx} ${cy}L${p[0].toFixed(2)} ${p[1].toFixed(2)}L${q[0].toFixed(2)} ${q[1].toFixed(2)}Z`, lit: i % 2 === 0 };
  });
}

/** A metal emblem per rank: shield, star, medal, diamond, crown. Bevelled faces, a rim and a gloss. */
function Emblem({ tier }: { tier: Tier }) {
  const c = LOOK[tier];
  const id = `rank-${tier}`;
  const light = `url(#${id}-l)`;
  const dark = `url(#${id}-d)`;
  const edge = { stroke: c.dark, strokeWidth: 1.2, strokeLinejoin: 'round' as const };
  const gloss = <ellipse cx="30" cy="22" rx="9" ry="4" fill="#fff" opacity="0.45" transform="rotate(-25 30 22)" />;
  const art: Record<Tier, React.ReactNode> = {
    silver: (
      <>
        <path d="M40 5 69 15v23c0 20-12.5 33-29 39C23.5 71 11 58 11 38V15Z" fill={dark} {...edge} />
        <path d="M40 13 20 20v18c0 15 9 25 20 31Z" fill={light} />
        <path d="M40 13 60 20v18c0 15-9 25-20 31Z" fill={c.mid} />
        <path d="M40 13v56" stroke={c.dark} strokeOpacity="0.35" strokeWidth="1" />
        {gloss}
      </>
    ),
    gold: (
      <>
        {starFacets(40, 42, 36, 15).map((f, i) => (
          <path key={i} d={f.d} fill={f.lit ? light : dark} stroke={c.dark} strokeWidth="0.6" strokeLinejoin="round" />
        ))}
      </>
    ),
    platinum: (
      <>
        <path d="M24 4h12l8 22H32Z" fill="#0f766e" />
        <path d="M56 4H44l-8 22h12Z" fill="#14b8a6" />
        <circle cx="40" cy="50" r="25" fill={dark} {...edge} />
        <circle cx="40" cy="50" r="19" fill={light} />
        {starFacets(40, 51, 11, 4.6).map((f, i) => (
          <path key={i} d={f.d} fill={f.lit ? '#f0fdfa' : c.dark} opacity="0.8" />
        ))}
        <path d="M22 44a19 19 0 0 1 13-12" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
    diamond: (
      <>
        <path d="M10 30 25 15h30l15 15L40 74Z" fill={c.mid} {...edge} />
        <path d="M25 15h30l-8 15H33Z" fill={c.light} />
        <path d="M10 30 25 15l8 15Z" fill={light} />
        <path d="M70 30 55 15l-8 15Z" fill={dark} />
        <path d="M10 30h23l7 44Z" fill={light} />
        <path d="M33 30h14l-7 44Z" fill={c.light} opacity="0.9" />
        <path d="M47 30h23L40 74Z" fill={dark} />
        <path d="M18 8l1.5 4 4 1.5-4 1.5L18 19l-1.5-4-4-1.5 4-1.5Z" fill="#fff" />
      </>
    ),
    majesty: (
      <>
        <path d="M12 56 9 22l17 16 14-24 14 24 17-16-3 34Z" fill={light} {...edge} />
        <path d="M40 14 54 38l17-16-3 34H40Z" fill={dark} opacity="0.55" />
        <rect x="11" y="55" width="58" height="12" rx="3" fill="#10b981" stroke="#047857" strokeWidth="1.2" />
        <rect x="11" y="55" width="58" height="4" rx="2" fill="#6ee7b7" opacity="0.6" />
        {[22, 40, 58].map((x) => (
          <g key={x}>
            <circle cx={x} cy="61" r="3.6" fill="#fde68a" stroke="#a16207" strokeWidth="0.8" />
            <circle cx={x - 1} cy="60" r="1.1" fill="#fff" />
          </g>
        ))}
        {[
          [9, 21],
          [40, 12],
          [71, 21],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4" fill="#fef3c7" stroke={c.dark} strokeWidth="1" />
        ))}
      </>
    ),
  };
  return (
    <svg viewBox="0 0 80 80" className="size-20 drop-shadow-[0_12px_16px_rgba(0,0,0,0.55)]" aria-hidden>
      <defs>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="1" stopColor={c.mid} />
        </linearGradient>
        <linearGradient id={`${id}-d`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c.mid} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {art[tier]}
    </svg>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'rgb(var(--brand-ta))' }} strokeWidth={2.5} />
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
                    <Line>Paid {holdLabel(perks.holdHours)} after approval</Line>
                    <Line>{perks.cashoutsPerWeek === Infinity ? 'Unlimited cash-outs' : `${perks.cashoutsPerWeek} cash-out${perks.cashoutsPerWeek === 1 ? '' : 's'} a week`}</Line>
                    {tierRank(t) >= tierRank(TRUSTED_FROM) && <Line>Trusted badge for businesses</Line>}
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
