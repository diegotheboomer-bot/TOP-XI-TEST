import Link from 'next/link';
import { ArrowLeftRight, Compass, House, LayoutList, LogOut, Plus, RotateCcw } from 'lucide-react';
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
      { href: '/streamer/campaigns/new', label: 'New campaign', icon: <Plus /> },
    ],
  },
  clipper: {
    title: 'Clipper',
    items: [
      { href: '/clipper', label: 'Home', icon: <House /> },
      { href: '/clipper/discover', label: 'Discover', icon: <Compass />, also: ['/clipper/campaigns'] },
    ],
  },
};

const footerItem = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

/** Sidebar layout for /streamer and /clipper. Each side only shows its own menu. */
export function AppLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const other: Role = role === 'streamer' ? 'clipper' : 'streamer';
  const footer = isDemo ? (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <ThemeToggle className="w-full" labelClassName="hidden lg:inline" />
      <Link href={`/${other}`} className={footerItem}>
        <ArrowLeftRight /> <span className="hidden lg:inline">Switch to {other} view</span>
        <span className="lg:hidden">{other === 'streamer' ? 'Streamer' : 'Clipper'}</span>
      </Link>
      <form action={resetDemoData}>
        <button className={footerItem}>
          <RotateCcw /> <span className="hidden lg:inline">Reset demo</span>
          <span className="lg:hidden">Reset</span>
        </button>
      </form>
    </div>
  ) : (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <ThemeToggle className="w-full" labelClassName="hidden lg:inline" />
      <form action={signOut}>
        <button className={footerItem}>
          <LogOut /> Sign out
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
