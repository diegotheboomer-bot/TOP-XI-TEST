'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChartColumn, CircleUser, LifeBuoy, LogOut, Settings, Wallet } from 'lucide-react';
import type { AccountSummary } from '@/lib/data';
import { TIER_LABEL } from '@/lib/tiers';
import { StreamerAvatar } from './views';
import { TierBadge } from './tier-badge';
import { ThemeToggle } from './theme-toggle';

/** Your picture in the top right; tap it for your profile, settings, money, support and sign out. */
export function AccountMenu({ me, clipper, signOut, small }: { me: AccountSummary; clipper: boolean; signOut: () => Promise<void>; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const links: [string, string, React.ElementType][] = clipper
    ? [
        ['/clipper/profile', 'Profile', CircleUser],
        ['/account', 'Settings', Settings],
        ['/clipper/payouts', 'Payouts', Wallet],
        ['/support', 'Support', LifeBuoy],
      ]
    : [
        ['/account', 'Settings', Settings],
        ['/streamer/money', 'Money', ChartColumn],
        ['/support', 'Support', LifeBuoy],
      ];

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Your account" className="relative block rounded-full ring-2 ring-transparent transition hover:ring-brand-a/40">
        <StreamerAvatar name={me.name || '?'} size={small ? 'sm' : 'md'} src={me.avatar} />
        {me.tier && <TierBadge tier={me.tier} founder={me.founder} iconOnly className={small ? 'absolute -bottom-1 -right-1.5 !size-[14px]' : 'absolute -bottom-1 -right-1'} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-zinc-100 p-4">
            <StreamerAvatar name={me.name || '?'} size="md" src={me.avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              <p className="truncate text-xs text-zinc-500">{me.email}</p>
              {me.tier && (
                <p className="text-xs font-medium" style={{ color: me.founder ? '#10b981' : undefined }}>
                  {me.founder ? `Founder #${String(me.founder).padStart(3, '0')} · ` : ''}
                  {TIER_LABEL[me.tier]}
                </p>
              )}
            </div>
          </div>
          <div className="p-1.5">
            {links.map(([href, label, Icon]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900">
                <Icon className="size-4 text-zinc-400" /> {label}
              </Link>
            ))}
            <ThemeToggle className="w-full" labelClassName="" />
          </div>
          <form action={signOut} className="border-t border-zinc-100 p-1.5">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
