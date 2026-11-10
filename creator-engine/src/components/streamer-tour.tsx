'use client';

// First-visit tour for streamers: three short steps, shown once per browser.
import { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, Megaphone } from 'lucide-react';
import { Button } from './ui/button';

const KEY = 'atlas-tour-streamer';
const STEPS = [
  { icon: Megaphone, title: 'Start a campaign', body: 'Pick how clippers get paid (per 1K views, per post or a pool), the kind of videos you want, and fund it.' },
  { icon: CheckCircle2, title: 'You approve every clip', body: 'Clips land on your campaign page. Nothing is paid until you approve, or your review window passes.' },
  { icon: BarChart3, title: 'See if it’s working', body: 'Stats shows your views, spend and what each 1,000 views cost you, per campaign and platform.' },
];

export function StreamerTour() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setStep(0);
    } catch {
      // storage blocked: skip the tour
    }
  }, []);
  if (step === null) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setStep(null);
  };
  const s = STEPS[step];
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(0_0_0/0.55)] p-4 backdrop-blur-[2px] sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div key={step} className="step-in w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <span className="font-mono text-[11px] text-zinc-500">
            {step + 1} of {STEPS.length}
          </span>
        </div>
        <span className="platform-tile relative mt-5 grid size-11 place-items-center overflow-hidden rounded-xl bg-brand text-brand-ink">
          <s.icon className="relative size-5" />
        </span>
        <h2 id="tour-title" className="mt-3 text-lg font-semibold tracking-tight">
          {s.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">{s.body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => (step === 0 ? done() : setStep(step - 1))}>
            {step === 0 ? 'Skip' : 'Back'}
          </Button>
          <Button onClick={() => (step === STEPS.length - 1 ? done() : setStep(step + 1))}>{step === STEPS.length - 1 ? 'Let’s go' : 'Next'}</Button>
        </div>
      </div>
    </div>
  );
}
