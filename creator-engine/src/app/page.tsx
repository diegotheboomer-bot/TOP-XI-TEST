import { ArrowRight, Link2, ShieldCheck, Wallet } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { ButtonLink } from '@/components/ui/button-link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const features = [
  {
    icon: ShieldCheck,
    title: 'Fraud engine',
    body: 'Perceptual hashing catches re-uploaded videos. A velocity watchdog freezes payouts on bot-like view spikes.',
  },
  {
    icon: Link2,
    title: 'Revenue attribution',
    body: 'Every creator gets a unique code and ?ref= link. Storefront webhooks tie each order back to the video that drove it.',
  },
  {
    icon: Wallet,
    title: 'Escrow payouts',
    body: 'Brands fund once. Creators are paid through Stripe Connect as they hit verified milestones — fee taken inline.',
  },
];

const steps = [
  ['Fund a campaign', 'Set a payout model — hybrid, CPM or per-sale — and deposit escrow.'],
  ['Creators connect & post', 'TikTok login proves ownership. No self-reported view counts.'],
  ['Pay on proof', 'Views sync automatically, sales attribute server-side, payouts release from escrow.'],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid grid-cols-1 items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <Badge tone="green" dot>
              Paid on proof, not vanity metrics
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Pay creators for the revenue they drive.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
              Run creator campaigns where views are API-verified, fraud is caught automatically and every sale is traced back to the video behind it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/brand">
                Start a campaign <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/creator" variant="secondary">
                I’m a creator
              </ButtonLink>
            </div>
          </div>

          <HeroPreview />
        </section>

        <section className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="flex flex-col gap-4">
              <span className="grid size-10 place-items-center rounded-xl bg-zinc-900 text-white">
                <f.icon className="size-[18px]" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.body}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="pb-24">
          <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white/60 p-5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-zinc-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-zinc-200/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-500 sm:px-6">
          <span>Creator Engine</span>
          <span>Supabase · Stripe Connect · TikTok API</span>
        </div>
      </footer>
    </>
  );
}

/** Static product preview — illustrative numbers only. */
function HeroPreview() {
  const bars = [32, 44, 38, 56, 50, 68, 74, 66, 82, 90];
  return (
    <Card className="min-w-0 p-6 sm:p-7" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Spring Cold Brew Launch</p>
          <p className="text-xs text-zinc-500">Hybrid · $2.50 CPM</p>
        </div>
        <Badge tone="green" dot>
          Live
        </Badge>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Views', '227k'],
          ['Orders', '68'],
          ['Revenue', '$4.1k'],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{k}</p>
            <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-md bg-zinc-900/90" style={{ height: `${h}%`, opacity: 0.25 + (i / bars.length) * 0.75 }} />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[
          ['@mayamakes', 0.92, 'Live'],
          ['@thebrewlab', 0.66, 'Live'],
        ].map(([name, pct]) => (
          <div key={name as string} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm text-zinc-600">{name}</span>
            <div className="min-w-0 flex-1">
              <Progress value={pct as number} max={1} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-sm text-zinc-600">@viral.daily</span>
          <div className="flex min-w-0 flex-1 justify-end">
            <Badge tone="red">Bot activity · paused</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
