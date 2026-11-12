'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpRight, BadgeCheck, Clapperboard, Rocket } from 'lucide-react';

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.classList.add('in');
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** A soft green glow that follows the cursor inside its parent (desktop only). */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent || window.matchMedia('(pointer: coarse)').matches) return;
    const move = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      el.style.background = `radial-gradient(500px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgb(var(--brand-a) / 0.10), transparent 60%)`;
    };
    parent.addEventListener('pointermove', move);
    return () => parent.removeEventListener('pointermove', move);
  }, []);
  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10" />;
}

// Example activity (illustrative, not real users), so the page feels alive.
const EVENTS: [React.ElementType, string][] = [
  [ArrowUpRight, 'A clipper cashed out $184.20'],
  [Clapperboard, '48 clips posted to a gaming campaign today'],
  [BadgeCheck, 'A clip passed 250K verified views'],
  [Rocket, 'A music label launched a $2K campaign'],
  [ArrowUpRight, 'A Diamond clipper earned $612 this week'],
  [Clapperboard, 'A streamer approved 30 clips in one tap'],
  [BadgeCheck, 'A new clipper reached Gold'],
  [Rocket, 'An indie game launched a trailer campaign'],
];

/** Endless strip of example activity under the hero. */
export function ActivityTicker() {
  const row = [...EVENTS, ...EVENTS];
  return (
    <div className="relative overflow-hidden border-t border-zinc-200/80 py-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="ticker flex w-max gap-8">
        {row.map(([Icon, text], i) => (
          <span key={i} className="flex shrink-0 items-center gap-2 text-sm text-zinc-600">
            <span className="grid size-6 place-items-center rounded-full bg-brand-a/15 text-[rgb(var(--brand-ta))]">
              <Icon className="size-3.5" />
            </span>
            {text}
          </span>
        ))}
      </div>
      <span className="sr-only">Example activity on Atlas</span>
    </div>
  );
}
