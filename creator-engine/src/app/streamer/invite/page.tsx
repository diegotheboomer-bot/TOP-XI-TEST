import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gift, Lock, Megaphone, PiggyBank, UserPlus, Users } from 'lucide-react';
import { getBrandReferralSummary } from '@/lib/data';
import { REFERRAL_DAYS } from '@/lib/referrals';
import { TIER_PERKS } from '@/lib/tiers';
import { usd, usdCents } from '@/lib/format';
import { ShareLink } from '@/components/invite/share-link';
import { StreamerAvatar } from '@/components/views';
import { cn } from '@/components/ui/cn';

export const dynamic = 'force-dynamic';

const FEE = TIER_PERKS.silver.feePct;

const STEPS = [
  { icon: Megaphone, title: 'Share your link with your community', body: 'Pin it in Discord, put it in your panels or say it on stream. Your viewers know your content best, so they make the best clippers.' },
  { icon: UserPlus, title: 'They join Atlas as clippers', body: 'They open your link and sign up. We remember it for 30 days on the phone or computer they opened it on.' },
  { icon: PiggyBank, title: 'Their fee becomes your budget', body: `For each clipper’s first ${REFERRAL_DAYS} days, the ${FEE}% fee on their cash-outs is added to your campaign budget, on any campaign they clip for.` },
];

/** Business invite link: clippers who join through it add their cash-out fee to the business's campaign budget. */
export default async function BrandInvitePage() {
  const r = await getBrandReferralSummary();
  if (!r) redirect('/streamer');
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-0 h-72 w-full" style={{ background: 'radial-gradient(55% 55% at 20% 50%, rgb(var(--brand-a) / 0.2), transparent 75%)' }} />
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-brand-a/15 px-3 py-1 text-xs font-semibold text-[rgb(var(--brand-ta))]">
          <Gift className="size-3.5" /> Invite & earn
        </p>
        <h1 className="balance relative mt-4 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Turn your community into <span className="text-brand">your clippers.</span>
        </h1>
        <p className="relative mt-3 max-w-xl text-zinc-500 sm:text-lg">
          Everyone who joins Atlas with your link adds the {FEE}% fee from their cash-outs to your campaign budget for {REFERRAL_DAYS} days. Your clips get cheaper the more your community clips.
        </p>
        {r.unlocked ? (
          <ShareLink link={r.link} className="relative mt-6" message="Clip my streams on Atlas and get paid per view. Join with my link:" />
        ) : (
          <div className="relative mt-6 flex flex-col gap-3 rounded-2xl bg-zinc-100/60 p-4 ring-1 ring-inset ring-zinc-200/60 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-200/70 text-zinc-500">
              <Lock className="size-5" />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold">Unlocks with your first funded campaign</span>
              <span className="block text-zinc-500">Set up a campaign and add a budget, then your invite link appears here.</span>
            </span>
            <Link href="/streamer/campaigns/new" className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink hover:brightness-110">
              Create a campaign
            </Link>
          </div>
        )}
        <dl className="relative mt-6 grid grid-cols-3 gap-1.5 sm:gap-2">
          {(
            [
              ['Joined', String(r.invited)],
              ['Active', String(r.active)],
              ['Budget added', usdCents(r.credited)],
            ] as const
          ).map(([k, v], i) => (
            <div key={k} className={cn('flex flex-col-reverse rounded-xl px-3 py-3 ring-1 ring-inset sm:px-4', i === 2 ? 'bg-brand-a/10 ring-brand-a/30' : 'bg-zinc-100/60 ring-zinc-200/50')}>
              <dt className="truncate text-[11px] text-zinc-500">{k}</dt>
              <dd className={cn('text-lg font-semibold tabular-nums tracking-tight sm:text-2xl', i === 2 && 'text-brand')}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

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
            20 of your viewers join with your link and each cashes out $200 in their first {REFERRAL_DAYS} days. That adds <b className="text-brand">{usd((20 * 200 * FEE) / 100)}</b> to your campaign budget, free.
          </p>
          <p className="mt-1 text-xs text-zinc-500">An example of the math, not a promise. The credit goes to a campaign of yours that’s running; it isn’t refunded to your card if you cancel.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-8">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Users className="size-4 text-[rgb(var(--brand-ta))]" /> Joined with your link
          </h2>
          <span className="text-sm text-zinc-500">{r.invited}</span>
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
          <p className="mt-4 rounded-2xl border border-dashed border-zinc-200 px-5 py-8 text-center text-sm text-zinc-500">No one yet. Pin your link in your Discord or stream panels to start.</p>
        )}
      </section>
    </div>
  );
}
