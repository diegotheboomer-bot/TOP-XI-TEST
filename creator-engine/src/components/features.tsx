'use client';

// "Why Atlas" grid: a glow follows the cursor across the cards, and each
// card has a small visual of the feature. Visuals are illustrative.
import { useRef } from 'react';
import { cn } from './ui/cn';

const FEATURES: [string, string, () => React.ReactNode][] = [
  ['Verified clippers', 'Every clip is checked against the clipper’s own TikTok, Instagram or YouTube, and you approve each one.', CodeArt],
  ['Fake views don’t pay', 'Bot spikes and re-uploads are caught and held before any money moves.', SpikeArt],
  ['Clippers level up', 'Proven clippers reach Gold, Diamond and Majesty: faster pay and their own campaigns. Clippers keep 100%; streamers pay {feeText} on top.', KeepArt],
];

export function Features({ feePercent }: { feePercent: number }) {
  const ref = useRef<HTMLDListElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    // Each card gets the cursor position relative to itself, so the glow spills across neighbours.
    for (const card of Array.from(el.children) as HTMLElement[]) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
  };
  return (
    <section className="border-t border-zinc-200/80 py-14">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Why Atlas</p>
      <h2 className="balance mt-1 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Only real views get paid</h2>
      <dl ref={ref} onPointerMove={move} className="group/grid relative mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-200/80 sm:grid-cols-3">
        {FEATURES.map(([title, body, Art], i) => (
          <div key={title} className="group relative bg-white p-5 sm:p-6">
            <div className="spotlight-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100" />
            <div className="relative">
              <div className="flex h-8 items-center justify-between sm:h-12">
                <span className="font-mono text-[11px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
                <div className="transition-transform duration-300 group-hover:-translate-y-0.5">
                  <Art />
                </div>
              </div>
              <dt className="mt-3 font-semibold tracking-tight sm:mt-4">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">{body.replace('{feeText}', feePercent ? `a flat ${feePercent}%` : 'only Stripe’s card processing')}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}


function CodeArt() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-brand-b/50 px-2.5 py-1 text-xs font-medium">
      @clipsbyrae
      <span className="grid size-3.5 place-items-center rounded-full bg-brand text-brand-ink">
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
      </span>
    </span>
  );
}



function KeepArt() {
  return <span className="text-brand font-mono text-2xl font-bold tracking-tight">100%</span>;
}

function SpikeArt() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 60 24" className="h-6 w-16 overflow-visible">
        <path d="M0 20 L12 18 L22 19 L30 17 L36 2 L40 19 L50 18 L60 17" fill="none" strokeWidth={1.5} className="stroke-zinc-400" />
        <circle cx="36" cy="2" r="2.5" className="fill-rose-600" />
      </svg>
      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-700">frozen</span>
    </span>
  );
}
