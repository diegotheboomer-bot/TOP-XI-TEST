import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, CreditCard, Eye, LifeBuoy, Lock, Receipt, RotateCcw, ShieldCheck } from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { Logo } from '@/components/site-header';

export const metadata: Metadata = { title: 'Is Atlas safe? · Atlas Clipping', description: 'Where your money goes on Atlas, and how to get it back.' };

const POINTS: [React.ElementType, string, string][] = [
  [CreditCard, 'Payments go through Stripe', 'You pay with Stripe’s checkout. Atlas never sees or stores your card number.'],
  [Receipt, 'Official receipt for every payment', 'Stripe emails you a receipt for each deposit, so you always have proof of what you paid.'],
  [Lock, 'Your budget is only for your campaign', 'It’s held for your campaign and only paid out for clips you approved, on views we verified.'],
  [Eye, 'Fake views aren’t paid', 'Every clip’s views are checked against its likes, comments, shares and how fast they came in. Suspicious clips are held for you to check.'],
  [RotateCcw, 'Stop anytime, get the rest back', 'End your campaign and the unspent budget goes back to your card automatically. Only the card processing fee isn’t refundable, because Stripe keeps it.'],
  [BadgeCheck, 'See every cent', 'Your Money page lists every deposit, payout to a clipper and refund.'],
];

/** Public trust page for businesses deciding whether to fund a campaign. */
export default function TrustPage() {
  return (
    <main className="gutter mx-auto max-w-2xl py-10 sm:py-14">
      <Link href="/" className="flex w-fit"><Logo /></Link>
      <p className="mt-8 flex w-fit items-center gap-1.5 rounded-full bg-brand-a/15 px-3 py-1 text-xs font-semibold text-[rgb(var(--brand-ta))]">
        <ShieldCheck className="size-3.5" /> Is Atlas safe?
      </p>
      <h1 className="balance mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your money, step by step.</h1>
      <p className="mt-2 text-zinc-500">Atlas is new, so here’s exactly where your money goes and how to get it back.</p>

      <ul className="mt-8 space-y-3">
        {POINTS.map(([Icon, title, body]) => (
          <li key={title} className="flex gap-3 rounded-2xl bg-zinc-100/50 p-4 ring-1 ring-inset ring-zinc-200/60">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-a/15 text-[rgb(var(--brand-ta))]"><Icon className="size-[18px]" /></span>
            <span>
              <span className="block font-semibold tracking-tight">{title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-zinc-500">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl bg-brand-a/10 p-5 ring-1 ring-inset ring-brand-a/30">
        <h2 className="font-semibold tracking-tight">Not sure yet? Start small.</h2>
        <p className="mt-1 text-sm text-zinc-500">Fund a $50 test, watch the clips and views come in, and only add more if it works for you.</p>
      </section>

      <section className="mt-8 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-zinc-500">
          Questions? Email <a className="font-medium text-zinc-900 underline" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> or join our Discord.
        </p>
        <div className="flex gap-2">
          <a href="https://discord.gg/WGcD2UUUHA" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-3.5 font-medium hover:bg-zinc-50">Discord</a>
          <Link href="/support" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 font-medium hover:bg-zinc-50"><LifeBuoy className="size-4" /> Support</Link>
        </div>
      </section>
      <p className="mt-8 text-xs text-zinc-400">
        Atlas Clipping is run by {LEGAL.companyName}. See our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
