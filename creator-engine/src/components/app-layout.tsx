import Link from 'next/link';
import { ArrowLeftRight, Compass, House, LayoutList, LogOut, Plus, RotateCcw, Wallet, Clapperboard, ChartColumn } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { resetDemoData, signOut } from '@/actions/account';
import { NextShell } from './next-shell';
import { ThemeToggle } from './theme-toggle';
import type { NavSection } from './app-shell';

export type Role = 'streamer' | 'clipper';

const SECTIONS: Record<Role, NavSection> = {
  streamer: {
    title: 'Streamer',
    items: [
      { href: '/streamer', label: 'Campaigns', icon: <LayoutList />, also: ['/streamer/campaigns'] },
      { href: '/streamer/campaigns/new', label: 'New campaign', icon: <Plus />, primary: true },
      { href: '/streamer/stats', label: 'Stats', icon: <ChartColumn /> },
    ],
  },
  clipper: {
    title: 'Clipper',
    items: [
      { href: '/clipper', label: 'Home', icon: <House /> },
      { href: '/clipper/discover', label: 'Discover', icon: <Compass />, also: ['/clipper/campaigns'] },
      { href: '/clipper/clips', label: 'Clips', icon: <Clapperboard /> },
      { href: '/clipper/earnings', label: 'Earnings', icon: <ChartColumn /> },
      { href: '/clipper/payouts', label: 'Payouts', icon: <Wallet /> },
    ],
  },
};

const footerItem = 'flex items-center gap-2 rounded-lg p-2 text-sm lg:w-full lg:px-2.5 lg:py-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

/** Sidebar layout for /streamer and /clipper. Each side only shows its own menu. */
export function AppLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const other: Role = role === 'streamer' ? 'clipper' : 'streamer';
  const footer = isDemo ? (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <ThemeToggle className="lg:w-full" labelClassName="hidden lg:inline" />
      <Link href={`/${other}`} className={footerItem} aria-label={`Switch to ${other} view`}>
        <ArrowLeftRight /> <span className="hidden lg:inline">Switch to {other} view</span>
      </Link>
      <form action={resetDemoData}>
        <button className={footerItem} aria-label="Reset demo">
          <RotateCcw /> <span className="hidden lg:inline">Reset demo</span>
        </button>
      </form>
    </div>
  ) : (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <ThemeToggle className="lg:w-full" labelClassName="hidden lg:inline" />
      <form action={signOut}>
        <button className={footerItem} aria-label="Sign out">
          <LogOut /> <span className="hidden lg:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
  return (
    <NextShell sections={[SECTIONS[role]]} demo={isDemo} footer={footer}>
      {children}
    </NextShell>
  );
}
