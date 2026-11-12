'use client';

// "How it works": pick a side (stream / clip), then step through three steps.
// Steps advance on their own (paused on hover) and each shows a small preview.
// Previews are illustrative; names and numbers are made up.
import { useEffect, useState } from 'react';
import { Check, Eye, Lock, Pin } from 'lucide-react';
import { cn } from './ui/cn';
import { PlatformIcon } from './platform-icon';

type Who = 'streamer' | 'clipper';
const STEP_MS = 5500;

const STEPS: Record<Who, [string, string][]> = {
  streamer: [
    ['Post a campaign', 'Set a rate per 1,000 views, a cap per clip and the platforms you want. Fund it once, plus {feeText}.'],
    ['Pin the moments', 'Drop timestamps from your stream. Each moment has a few slots so clippers spread out.'],
    ['Pay for real views', 'Views come straight from TikTok and YouTube. You only pay for what was watched, and clips are paid automatically 3 days after approval.'],
  ],
  clipper: [
    ['Pick a campaign', 'See the rate, the budget left and what you would take home before you join.'],
    ['Claim and cut', 'Claim a moment, cut it your way and post it from your connected TikTok, Instagram or verified YouTube channel.'],
    ['Get paid automatically', 'Earnings update every few hours. Cash out to your bank, PayPal or Venmo. Just 2% plus Stripe’s payout fee when you cash out.'],
  ],
};

export function HowItWorks({ feePercent }: { feePercent: number }) {
  const [who, setWho] = useState<Who>('streamer');
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // restarts the progress bar animation

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => {
      setStep((s) => (s + 1) % 3);
      setCycle((c) => c + 1);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [paused, step, who, cycle]);

  const go = (s: number) => {
    setStep(s);
    setCycle((c) => c + 1);
  };

  return (
    <section className="border-t border-zinc-200/80 py-14" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">How it works</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Three steps, either side</h2>
        </div>
        <div role="tablist" aria-label="Show steps for" className="flex rounded-full border border-zinc-200/80 bg-white p-1 font-mono text-xs">
          {(['streamer', 'clipper'] as const).map((w) => (
            <button
              key={w}
              role="tab"
              type="button"
              aria-selected={who === w}
              onClick={() => {
                setWho(w);
                go(0);
              }}
              className={cn('h-8 rounded-full px-4 font-medium transition', who === w ? 'bg-brand text-brand-ink' : 'text-zinc-500 hover:text-zinc-900')}
            >
              {w === 'streamer' ? 'I stream' : 'I clip'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <ol className="space-y-2">
          {STEPS[who].map(([title, body], i) => {
            const on = i === step;
            return (
              <li key={title}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={on ? 'step' : undefined}
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl border p-4 text-left transition sm:p-5',
                    on ? 'border-zinc-300 bg-white shadow-card' : 'border-transparent hover:bg-white/60',
                  )}
                >
                  <span className="flex gap-4">
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg font-mono text-xs font-semibold transition', on ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
                      0{i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block font-medium transition', !on && 'text-zinc-500')}>{title}</span>
                      <span className={cn('grid transition-all duration-300', on ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                        <span className="overflow-hidden text-sm leading-relaxed text-zinc-600">{body.replace('{feeText}', feePercent ? `a ${feePercent}% fee` : 'Stripe’s card processing, with no service fee')}</span>
                      </span>
                    </span>
                  </span>
                  {on && (
                    <span
                      key={`${who}-${cycle}`}
                      className="step-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand"
                      style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        <div aria-hidden className="relative grid min-h-[19rem] place-items-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50 p-5 sm:p-8">
          <div className="hero-grid pointer-events-none absolute inset-0" />
          <div key={`${who}-${step}`} className="step-in relative w-full max-w-sm">
            <Preview who={who} step={step} feePercent={feePercent} />
          </div>
        </div>
      </div>
    </section>
  );
}

const card = 'rounded-xl border border-zinc-200/80 bg-white p-4 shadow-card';
const label = 'font-mono text-[10px] uppercase tracking-wider text-zinc-500';

function Preview({ who, step, feePercent }: { who: Who; step: number; feePercent: number }) {
  const key = `${who}${step}`;
  if (key === 'streamer0') {
    const budget = 5000;
    // Launch pricing (feePercent 0): only Stripe's card processing, about 3.5% + $0.35.
    const fee = feePercent ? (budget * feePercent) / 100 : Math.round(budget * 3.5 + 35) / 100;
    return (
      <div className={card}>
        <p className={label}>New campaign</p>
        <p className="mt-1 font-semibold">Ranked grind · season 4</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Field k="Rate" v="$2.00 / 1K" />
          <Field k="Cap per clip" v="$500" />
        </div>
        <div className="mt-3 flex gap-1.5">
          {(
            [
              ['tiktok', 'TikTok'],
              ['youtube', 'Shorts'],
              ['instagram', 'Reels'],
            ] as const
          ).map(([id, p]) => (
            <span key={p} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-b/60 bg-brand-a/10 px-2.5 py-1.5 text-xs font-medium">
              <PlatformIcon platform={id} className="size-3.5 text-[rgb(var(--brand-ta))]" />
              {p}
              <span className="grid size-3.5 place-items-center rounded-full bg-brand text-brand-ink">
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-zinc-200/80 pt-3 font-mono text-xs tabular-nums">
          <Row k="Budget" v={`$${budget.toLocaleString()}`} />
          <Row k={feePercent ? `Fee ${feePercent}%` : 'Card processing'} v={`$${fee.toLocaleString()}`} />
          <Row k="Total" v={`$${(budget + fee).toLocaleString()}`} strong />
        </div>
      </div>
    );
  }
  if (key === 'streamer1') {
    const pins = [
      ['2:14:08', '1v3 clutch', 3, 1],
      ['3:40:12', 'chat loses it', 2, 2],
      ['4:02:55', 'rage quit', 3, 0],
    ] as const;
    return (
      <div className={card}>
        <p className={label}>Moment board</p>
        <ul className="mt-3 space-y-2">
          {pins.map(([t, name, slots, taken], i) => (
            <li key={t} className="step-stagger flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5" style={{ animationDelay: `${i * 90}ms` }}>
              <Pin className="size-3.5 shrink-0 text-brand-b" />
              <span className="font-mono text-xs tabular-nums text-zinc-500">{t}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
              <span className="flex gap-1">
                {Array.from({ length: slots }, (_, s) => (
                  <span key={s} className={cn('h-3 w-1.5 rounded-sm', s < taken ? 'bg-brand' : 'bg-zinc-200')} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (key === 'streamer2') {
    const clips = [
      ['TikTok', '48.2K', '$96.40', 'pays in 1d 6h'],
      ['Shorts', '21.9K', '$43.80', 'paid'],
      ['Reels', '9.1K', '—', 'in review'],
    ] as const;
    return (
      <div className={card}>
        <p className={label}>Clips · real views</p>
        <ul className="mt-3 divide-y divide-zinc-200/80">
          {clips.map(([p, views, cost, status], i) => (
            <li key={p} className="step-stagger flex items-center gap-3 py-2.5 text-sm" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="w-14 font-semibold">{p}</span>
              <span className="flex flex-1 items-center gap-1 font-mono text-xs tabular-nums text-zinc-500">
                <Eye className="size-3" /> {views}
              </span>
              <span className="font-mono text-xs tabular-nums">{cost}</span>
              <span className={cn('w-24 text-right font-mono text-[10px]', status === 'paid' ? 'text-brand' : 'text-zinc-500')}>{status}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (key === 'clipper0') {
    return (
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={label}>marlowkade</p>
            <p className="mt-1 font-semibold">Ranked grind · season 4</p>
          </div>
          <span className="rounded-full bg-brand px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-ink">$2.00 / 1K</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between font-mono text-[11px] text-zinc-500">
            <span>budget left</span>
            <span className="tabular-nums text-zinc-900">$3,210 of $5,000</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className="step-bar h-full rounded-full bg-brand" style={{ width: '64%' }} />
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm">
          A clip at <span className="font-mono tabular-nums">50K</span> views takes home <span className="font-semibold text-brand">$100.00</span>
        </div>
      </div>
    );
  }
  if (key === 'clipper1') {
    return (
      <div className={card}>
        <div className="flex items-center justify-between">
          <p className={label}>Moment · 2:14:08</p>
          <span className="flex items-center gap-1 font-mono text-[11px] text-brand">
            <Check className="size-3.5" /> slot 2 of 3 claimed
          </span>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-zinc-500">Caption</p>
        <p className="mt-1.5 rounded-lg border border-zinc-200/80 bg-zinc-50 px-3 py-3 text-sm leading-relaxed">
          he did NOT see that coming
          <span className="step-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-zinc-900" />
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500"><Check className="size-3.5 text-[rgb(var(--brand-ta))]" /> Posting from your verified channel @clipsbyrae</p>
      </div>
    );
  }
  const timeline = [
    ['Approved', 'Mon'],
    ['3-day hold', 'Tue – Wed'],
    ['Paid', 'Thu'],
  ] as const;
  return (
    <div className={card}>
      <p className={label}>Payout</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-brand">$97.43</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
        <Lock className="size-3.5" /> to bank •••• 4021
      </p>
      <ol className="mt-5 flex items-center">
        {timeline.map(([t, when], i) => (
          <li key={t} className="step-stagger flex flex-1 items-center" style={{ animationDelay: `${i * 160}ms` }}>
            <span className="flex flex-col items-start">
              <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink">
                <Check className="size-3.5" />
              </span>
              <span className="mt-1.5 text-xs font-medium">{t}</span>
              <span className="font-mono text-[10px] text-zinc-500">{when}</span>
            </span>
            {i < 2 && <span className="mx-2 mb-8 h-px flex-1 bg-brand-b/60" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-zinc-200/80 px-3 py-2">
      <p className="font-mono text-[10px] text-zinc-500">{k}</p>
      <p className="font-medium tabular-nums">{v}</p>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between', strong ? 'font-semibold text-zinc-900' : 'text-zinc-500')}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
