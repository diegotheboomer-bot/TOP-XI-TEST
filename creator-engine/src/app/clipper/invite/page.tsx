import { redirect } from 'next/navigation';
import { Banknote, ChevronDown, Gift, Link2, Share2, UserPlus } from 'lucide-react';
import { getReferralSummary } from '@/lib/data';
import { REFERRAL_DAYS } from '@/lib/referrals';
import { MIN_CASHOUT } from '@/lib/payout-rules';
import { TIER_PERKS } from '@/lib/tiers';
import { usd, usdCents } from '@/lib/format';
import { ShareLink } from '@/components/invite/share-link';
import { StreamerAvatar } from '@/components/views';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

const FEE = TIER_PERKS.silver.feePct;

const STEPS = [
  { icon: Share2, title: 'Share your link', body: 'Drop it in DMs, Discord, your bio, anywhere clippers hang out.' },
  { icon: Link2, title: 'They sign up with it', body: 'Your friend opens your link, then makes their account. We remember the link for 30 days on the phone or computer they opened it on.' },
  { icon: Gift, title: `You get their ${FEE}% fee`, body: `Every time they cash out in their first ${REFERRAL_DAYS} days, the ${FEE}% fee goes to you instead of Atlas. It costs them nothing extra.` },
  { icon: Banknote, title: 'It lands in your account', body: `Sent to your payout account once it adds up to ${usd(MIN_CASHOUT)}. Stripe’s payout fee comes off, like any cash-out.` },
];

const FAQ: [string, string][] = [
  ['Do they have to use my link?', 'Yes. Only people who open your link and then sign up count. If they sign up without it, they can’t be added to you later.'],
  ['Is there a limit?', 'No. Invite as many clippers as you want, and there’s no cap on what you can earn from them.'],
  ['Does it cost my friend anything?', `No. They pay the same ${FEE}% cash-out fee as everyone. It just goes to you instead of Atlas.`],
  ['What happens after 90 days?', 'Their fee goes back to Atlas. You keep everything you already earned, and your friend stays on your list as finished.'],
  ['Can I invite myself with a second account?', 'No. Fake or self-made accounts don’t earn rewards, and rewards from them can be withheld.'],
];

export default async function InvitePage({ searchParams }: { searchParams: { own?: string } }) {
  const r = await getReferralSummary();
  if (!r) redirect('/clipper');
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {searchParams.own && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You opened your own invite link. It only counts when someone new signs up on their own phone or computer, so share it instead.
        </p>
      )}
      {/* Hero: the pitch, the link and your totals in one card */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-0 h-72 w-full" style={{ background: 'radial-gradient(55% 55% at 20% 50%, rgb(var(--brand-a) / 0.2), transparent 75%)' }} />
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-brand-a/15 px-3 py-1 text-xs font-semibold text-[rgb(var(--brand-ta))]">
          <UserPlus className="size-3.5" /> Invite & earn
        </p>
        <h1 className="balance relative mt-4 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Get paid every time <span className="text-brand">your friends get paid.</span>
        </h1>
        <p className="relative mt-3 max-w-xl text-zinc-500 sm:text-lg">
          Passive money from one link. For each friend’s first {REFERRAL_DAYS} days, the {FEE}% fee on their cash-outs is yours. No cap on friends, no cap on earnings.
        </p>
        <ShareLink link={r.link} className="relative mt-6" />
        <dl className="relative mt-6 grid grid-cols-3 gap-1.5 sm:gap-2">
          {(
            [
              ['Invited', String(r.invited)],
              ['Earning for you', String(r.active)],
              ['You’ve earned', usdCents(r.earned)],
            ] as const
          ).map(([k, v], i) => (
            <div key={k} className={cn('flex flex-col-reverse rounded-xl px-3 py-3 ring-1 ring-inset sm:px-4', i === 2 ? 'bg-brand-a/10 ring-brand-a/30' : 'bg-zinc-100/60 ring-zinc-200/50')}>
              <dt className="truncate text-[11px] text-zinc-500">{k}</dt>
              <dd className={cn('text-lg font-semibold tabular-nums tracking-tight sm:text-2xl', i === 2 && 'text-brand')}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works + an example, one card */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
        <ol className="relative mt-5 space-y-5">
          <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-px bg-gradient-to-b from-brand-a/60 via-zinc-200 to-transparent" />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="relative flex gap-4">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl ring-4 ring-white', i === 2 ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-600')}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="pt-0.5">
                  <span className="block font-semibold tracking-tight">{s.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-zinc-500">{s.body}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 rounded-2xl bg-brand-a/10 p-4 ring-1 ring-inset ring-brand-a/30 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--brand-ta))]">Example</p>
          <p className="mt-1 text-sm leading-relaxed sm:text-base">
            Invite <b>10 friends</b>. Each cashes out <b>$500</b> in their first {REFERRAL_DAYS} days. That’s <b className="text-brand">{usd(10 * 500 * FEE / 100)} for you</b>, from one link you shared once. Invite 50 and it’s {usd(50 * 500 * FEE / 100)}.
          </p>
          <p className="mt-1 text-xs text-zinc-500">An example of the math, not a promise: what you earn depends on what your friends cash out.</p>
        </div>
        {/* Questions, in the same card */}
        <div className="-mx-5 mt-6 border-t border-zinc-100 px-5 pt-2 sm:-mx-8 sm:px-8">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-zinc-100 py-3 last:border-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="size-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Who joined */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your invites</h2>
          <span className="text-sm text-zinc-500">{r.invited} joined</span>
        </div>
        {r.people.length ? (
          <ul className="mt-4 divide-y divide-zinc-100">
            {r.people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <StreamerAvatar name={p.name} size="md" src={p.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-zinc-500">Joined {new Date(p.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
                {p.active ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-a/15 px-2.5 py-1 text-xs font-semibold text-[rgb(var(--brand-ta))]">
                    <span className="size-1.5 animate-pulse rounded-full bg-brand-a" /> Active · {p.daysLeft} {p.daysLeft === 1 ? 'day' : 'days'} left
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">Finished</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 px-5 py-8 text-center">
            <UserPlus className="mx-auto size-6 text-zinc-400" />
            <p className="mt-2 font-medium">No one yet</p>
            <p className="mt-1 text-sm text-zinc-500">When a friend signs up with your link, they show up here with how many days you have left.</p>
          </div>
        )}
      </section>

    </div>
  );
}
