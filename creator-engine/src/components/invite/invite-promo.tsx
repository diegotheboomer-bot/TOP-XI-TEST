'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Infinity as InfinityIcon, Timer, Users, X } from 'lucide-react';
import { ShareLink } from './share-link';

const KEY = 'atlas-invite-promo-seen';

/** A one-time popup on the clipper home that pushes the invite link. Shown once per browser. */
export function InvitePromo({ link }: { link: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {
      seen = true; // storage blocked: don't nag
    }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="invite-promo-title" onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[140%] -translate-x-1/2" style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgb(var(--brand-a) / 0.28), transparent 70%)' }} />
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
          <X className="size-4" />
        </button>
        <span className="relative grid size-14 place-items-center rounded-2xl bg-brand text-brand-ink shadow-[0_12px_30px_-10px_rgb(var(--brand-b)/0.9)]">
          <Gift className="size-7" />
        </span>
        <h2 id="invite-promo-title" className="relative mt-4 text-2xl font-semibold leading-tight tracking-tight">
          Make money while you sleep.
        </h2>
        <p className="relative mt-2 text-zinc-500">
          Invite a friend. Every time they cash out in their first 90 days, <span className="font-semibold text-zinc-900">their 5% fee goes to you</span>. It costs them nothing extra.
        </p>
        <ul className="relative mt-4 grid grid-cols-3 gap-1.5 text-center text-[11px] text-zinc-500">
          {[
            [InfinityIcon, 'No limit'],
            [Users, 'Every friend'],
            [Timer, '90 days each'],
          ].map(([Icon, t]) => {
            const I = Icon as React.ElementType;
            return (
              <li key={t as string} className="rounded-xl bg-zinc-100/60 px-2 py-2.5">
                <I className="mx-auto mb-1 size-4 text-[rgb(var(--brand-ta))]" />
                {t as string}
              </li>
            );
          })}
        </ul>
        <ShareLink link={link} className="relative mt-5" />
        <Link href="/clipper/invite" onClick={close} className="relative mt-3 block text-center text-sm font-medium text-zinc-500 hover:text-zinc-900">
          See how it works →
        </Link>
      </div>
    </div>
  );
}
